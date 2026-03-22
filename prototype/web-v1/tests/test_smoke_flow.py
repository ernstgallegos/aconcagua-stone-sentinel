import pytest
import contextlib
import functools
import http.server
import socketserver
import threading
from pathlib import Path

sync_api = pytest.importorskip(
    "playwright.sync_api",
    reason="Install requirements-dev.txt and run `python -m playwright install --with-deps chromium` to enable the browser smoke test.",
)
sync_playwright = sync_api.sync_playwright


REPO_ROOT = Path(__file__).resolve().parents[3]


class QuietStaticHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        return


def _active_screen(page):
    return page.locator('.screen.active').get_attribute('id')


@contextlib.contextmanager
def static_server(root: Path):
    handler = functools.partial(QuietStaticHandler, directory=str(root))
    with socketserver.TCPServer(('127.0.0.1', 0), handler) as httpd:
        port = httpd.server_address[1]
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        try:
            yield f'http://127.0.0.1:{port}'
        finally:
            httpd.shutdown()
            thread.join(timeout=2)


def expect_disabled(page, selector: str, expected: bool):
    disabled = page.locator(selector).is_disabled()
    assert disabled is expected, f'{selector} disabled state expected {expected}, got {disabled}'


def reach_expedition_setup(page):
    """Navigate from title to expedition-setup screen."""
    page.click('#screen-title .btn-primary')
    page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-expedition-setup'")


def test_canonical_flow_and_part2_unlock_gate_smoke():
    with static_server(REPO_ROOT) as base_url, sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(f'{base_url}/prototype/web-v1/index.html', wait_until='networkidle')

        for screen in [
            'splash', 'title', 'expedition-setup', 'onboarding',
            'game', 'debrief', 'summit-success', 'part2-character',
        ]:
            page.wait_for_selector(f'#screen-{screen}')

        assert _active_screen(page) == 'screen-splash'

        page.click('#screen-splash')
        page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-title'")

        reach_expedition_setup(page)

        # Navigate difficulty carousel to Very Hard (index 4, starting from Standard=2)
        page.click('#carousel-arrow-difficulty-next')
        page.click('#carousel-arrow-difficulty-next')
        page.wait_for_function(
            "() => document.getElementById('carousel-card-difficulty')?.querySelector('.carousel-card-name')?.textContent?.includes('Very Hard') || "
            "document.getElementById('carousel-card-difficulty')?.querySelector('.carousel-card-name')?.textContent?.includes('Muy difícil')"
        )

        # Begin expedition with defaults (Standard difficulty carousel position already valid,
        # but we navigated to Very Hard above — character/scenario defaults are index 0)
        page.click('#btn-begin-expedition')

        page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-onboarding'")
        assert 'Very Hard' in page.locator('#onboard-char-line').inner_text()
        page.click('#screen-onboarding .btn-ghost')
        page.wait_for_function("() => document.getElementById('tutorial-modal')?.classList.contains('visible')")
        page.click('#tutorial-modal .btn-ghost')
        page.wait_for_function("() => !document.getElementById('tutorial-modal')?.classList.contains('visible')")
        page.click('#screen-onboarding .btn-primary')
        page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-game'")

        page.evaluate("() => window.showScreen('part2-character')")
        page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-debrief'")

        page.evaluate(
            """async () => {
                const state = await import('/prototype/web-v1/state/game-state.js');
                state.updateRunState(state.G, { finalOutcome: 'Summit and Safe Return' });
                window.showScreen('part2-character');
            }"""
        )

        page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-part2-character'")
        expect_disabled(page, '#btn-part2-confirm', True)

        page.click('#part2-char-francisco')
        expect_disabled(page, '#btn-part2-confirm', False)

        browser.close()


def test_shoot_photo_visibility_stays_daniela_only_smoke():
    with static_server(REPO_ROOT) as base_url, sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        def reach_game_with_character(character_id: str):
            page.goto(f'{base_url}/prototype/web-v1/index.html', wait_until='networkidle')
            page.click('#screen-splash')
            page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-title'")
            reach_expedition_setup(page)

            # Use JS to set carousel to the desired character by index
            # Characters order in data/characters.json: francisco=0, laura=1, erik=2, daniela=3, blake=4, irina=5
            char_indices = {
                'francisco': 0, 'laura': 1, 'erik': 2,
                'daniela': 3, 'blake': 4, 'irina': 5,
            }
            char_idx = char_indices.get(character_id, 0)
            # Ensure char_idx is a plain integer before embedding in JS
            assert isinstance(char_idx, int) and 0 <= char_idx <= 5, f"Unexpected char_idx {char_idx!r}"
            page.evaluate(
                f"() => {{ window.CAROUSEL_STATE.character.index = {char_idx}; window.renderCarousel('character'); }}"
            )

            page.click('#btn-begin-expedition')
            page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-onboarding'")
            page.click('#screen-onboarding .btn-primary')
            page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-game'")

        reach_game_with_character('francisco')
        assert page.locator('#btn-shoot-photo').evaluate("button => getComputedStyle(button).display") == 'none'
        page.keyboard.press('6')
        assert page.locator('#btn-shoot-photo').evaluate("button => getComputedStyle(button).display") == 'none'

        reach_game_with_character('daniela')
        assert page.locator('#btn-shoot-photo').evaluate("button => getComputedStyle(button).display") != 'none'
        assert page.locator('#btn-shoot-photo').is_enabled()
        browser.close()
