# Third-party software, content, and data review

**Engineering review date:** July 22, 2026

**Scope:** production dependency lockfile, interface assets, regulatory links, VA form links, and local educational summaries.

## Result

The production lockfile reports no unknown license values. The automated gate permits the reviewed permissive set and requires explicit review of CC BY and LGPL expressions. The public `/licenses` page and `THIRD_PARTY_NOTICES.md` record material components, attribution-sensitive data, and source links.

The application does not include copied rating content from commercial veteran-claims websites. Condition and form text is locally authored and tied to primary eCFR or VA sources through `/sources`. Lucide icons are attributed. Debrief uses no VA seal and makes no affiliation claim.

## Release control

`npm run licenses:check` reads the committed production lockfile. It fails on an unknown or unreviewed license and if material notice entries disappear. Dependency upgrades therefore require both a lockfile review and, when needed, a notice update. The exact upstream license text remains in each installed package and upstream repository; source redistributions must preserve those files.

## Residual legal work

This completes the independently executable inventory and notice work for LEGAL-008. Qualified counsel must still determine the operator’s obligations, the product/mark review in LEGAL-007, and whether any particular distribution or future copied content changes the license analysis. A legal approval is not inferred from this engineering review.
