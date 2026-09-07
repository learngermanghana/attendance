# Structured submission marking contract

Falowen Campus may now send a single student textarea together with `structuredSections`.

Admin marking must prefer the structured fields because the canonical Teil ownership is already known by the campus. `resolveStructuredSubmissionText` reconstructs the standard `Teil N` text expected by the existing deterministic parser. If structured fields are missing, the legacy submission text is used unchanged so historical submissions remain markable.
