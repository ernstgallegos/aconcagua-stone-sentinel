# Devlog 003 — Mountain as System

This entry records why the project incorporated Aconcagua’s physiological reality into the MRA simulator instead of keeping it as background narrative.

---

The starting problem was structural: partial information in the prototype depended mainly on weather as a single source of noise. That was useful for first validation, but not faithful to high-altitude climbing reality. On Aconcagua, uncertainty comes from at least two independent channels: external conditions and internal cognitive degradation. Without the second channel, the model can understate risk precisely where real expeditions become most deceptive.

The central finding is that hypoxia does not only degrade physical output. It degrades interpretation itself. Around 5,500 m, memory registration is already less reliable. Around 6,000 m, judgment can degrade before full physical collapse. In design terms, this means numeric body-state indicators are not sufficient by themselves: a climber can retain apparently acceptable `functional_capacity` while still producing unreliable self-readings.

The system translation follows directly from that finding. We introduced `cognitive_noise()` as a second uncertainty component independent from weather, and updated `uncertainty_level()` so uncertainty combines environmental noise plus cognitive noise. This allows a high-altitude, high-fatigue run to remain uncertain even with clear skies. The mountain is not necessarily hiding information; the body is.

That same realism forced a second decision: `wait` cannot mean the same thing at every altitude. At extreme camps, non-restorative sleep and accumulated exposure make passive waiting strategically expensive. The simulator now degrades high-altitude waiting accordingly. This changes the decision profile of late-push starts: waiting can still be justified, but no longer as a default safe strategy.

The ordering principle that guided all these changes remains simple and reusable: does knowing this real-world fact change the player’s decision quality? If yes, it is a systemic element and belongs in simulation and scenarios. If no, it is environmental narrative and belongs in docs or later representational layers. This filter should be applied to every new Aconcagua-derived feature before it is promoted into the prototype.
