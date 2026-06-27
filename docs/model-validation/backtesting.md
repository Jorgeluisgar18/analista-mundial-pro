# Backtesting and Calibration

The app must not claim model accuracy without historical validation. Initial validation metrics:

- Brier score for calibrated probabilities.
- Log loss for probabilistic sharpness.
- Ranked probability score for ordered scoreline/gols markets.
- Closing-line comparison when odds history exists.
- ROI simulation only as a diagnostic, never as a guarantee.

## Rules

- Keep historical datasets traceable to source, file path, commit and import timestamp.
- Separate calibration quality from betting profitability.
- Treat ROI as an after-the-fact diagnostic, not a promise.
- Report sample size, date range, competition coverage and missing-data exclusions.
