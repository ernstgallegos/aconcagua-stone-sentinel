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
    """Navigate from welcome screen to expedition-setup screen."""
    page.click('.title-screen-advance')
    page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-expedition-setup'")


def test_canonical_flow_and_part2_unlock_gate_smoke():
    with static_server(REPO_ROOT) as base_url, sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(f'{base_url}/prototype/web-v1/index.html', wait_until='networkidle')

        for screen in [
            'title', 'expedition-setup', 'onboarding',
            'game', 'debrief', 'summit-success', 'part2-character',
        ]:
            page.wait_for_selector(f'#screen-{screen}', state='attached')

        assert _active_screen(page) == 'screen-title'
        assert page.locator('#theme-select option').all_inner_texts() == ['🌙', '☀️', '🌇', '🌓']
        page.click('.title-info-trigger')
        page.wait_for_function("() => document.getElementById('intro-modal')?.classList.contains('visible')")
        page.click('#intro-modal .btn-ghost')
        page.wait_for_function("() => !document.getElementById('intro-modal')?.classList.contains('visible')")

        reach_expedition_setup(page)

        # Begin expedition with defaults (character/scenario defaults are index 0)
        page.click('#btn-begin-expedition')

        page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-onboarding'")
        onboard_text = page.locator('#onboard-char-line').inner_text()
        assert len(onboard_text) > 0
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

        # Screen starts at Francisco + guided-normal-route → confirm immediately enabled
        expect_disabled(page, '#btn-part2-confirm', False)

        # Character carousel has one card per character (6 dots)
        assert page.locator('#part2-carousel-dots-character .carousel-dot').count() == 6
        # Route carousel has one card per route (3 dots)
        assert page.locator('#part2-carousel-dots-route .carousel-dot').count() >= 3

        # Navigate character to a locked character (Laura, index 1)
        page.click('#part2-carousel-arrow-character-next')
        expect_disabled(page, '#btn-part2-confirm', True)
        assert page.locator('#part2-carousel-card-character .part2-lock-pill').count() == 1

        # Navigate back to Francisco — confirm should be enabled again
        page.click('#part2-carousel-arrow-character-prev')
        expect_disabled(page, '#btn-part2-confirm', False)

        # Navigate route to a locked route (independent-normal-route, index 1)
        page.click('#part2-carousel-arrow-route-next')
        expect_disabled(page, '#btn-part2-confirm', True)
        assert page.locator('#part2-carousel-card-route .part2-lock-pill').count() == 1

        # Navigate back to guided-normal-route — confirm should be enabled
        page.click('#part2-carousel-arrow-route-prev')
        expect_disabled(page, '#btn-part2-confirm', False)

        page.click('#btn-part2-confirm')
        page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-part2-hotel'")

        browser.close()



def test_post_summit_return_requires_explicit_horcones_exit_smoke():
    with static_server(REPO_ROOT) as base_url, sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto(f'{base_url}/prototype/web-v1/index.html', wait_until='networkidle')
        reach_expedition_setup(page)
        page.click('#btn-begin-expedition')
        page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-onboarding'")
        page.click('#screen-onboarding .btn-primary')
        page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-game'")

        page.evaluate(
            """async () => {
                const state = await import('/prototype/web-v1/state/game-state.js');
                state.updateRunState(state.G, {
                    finalOutcome: 'Strategic Retreat',
                    hasSummited: true,
                    highestPosIdx: 14,
                    turn: 12,
                    turnLog: [],
                    allFlags: [],
                });
                state.G.state.position = 'confluencia';
                state.G.state.functional_capacity = 80;
                state.G.state.fatigue = 25;
                state.G.state.exposure = 15;
                state.G.state.weather_severity = 0;
                state.G.state.visibility = 3;
                state.G.state.water = 10;
                state.G.state.food = 10;
                window.makeDecision('descend');
            }"""
        )

        page.wait_for_timeout(1200)
        page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-game'")
        assert page.evaluate("async () => (await import('/prototype/web-v1/state/game-state.js')).G.state.position") == 'horcones'
        assert page.evaluate("async () => (await import('/prototype/web-v1/state/game-state.js')).G.finalOutcome") == 'Strategic Retreat'

        page.evaluate("() => window.makeDecision('descend')")
        page.wait_for_function("() => document.querySelector('.screen.active')?.id === 'screen-summit-success'")
        assert page.evaluate("async () => (await import('/prototype/web-v1/state/game-state.js')).G.finalOutcome") == 'Summit and Safe Return'

        browser.close()


def test_shoot_photo_visibility_stays_daniela_only_smoke():
    with static_server(REPO_ROOT) as base_url, sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        def reach_game_with_character(character_id: str):
            page.goto(f'{base_url}/prototype/web-v1/index.html', wait_until='networkidle')
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
