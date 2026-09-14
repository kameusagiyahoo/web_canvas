# Backup and recovery

web_canvas is intentionally local-first. Projects are primarily stored in this browser on this device, so browser storage is convenient working storage rather than a substitute for an external backup.

## Routine backup

For projects you care about:

1. open **Projects**;
2. choose **Export file** on the project you want to protect;
3. keep the downloaded versioned Project JSON somewhere outside browser local storage.

A JSON backup is portable and can be imported later on the same or another browser/device that can run web_canvas.

## Restore a backup

From **Projects**, choose **Open file** and select a valid Project JSON backup.

Project Manager imports that file as a separate managed project. It does not replace the project currently being edited. This makes recovery deliberately non-destructive.

The toolbar's separate **Open project** path is different: it is the intentional replace-current-project flow and requires confirmation before replacement.

## If autosave fails

If browser persistence is full or unavailable, web_canvas shows a persistent storage warning with **Save Project JSON**.

Use that action before continuing important work. The recovery export is built from the current in-memory document, so it can contain edits that the browser was unable to persist locally.

After downloading the JSON, free browser storage or move to a browser where local storage works, then import the backup from **Projects → Open file**.

## Undo versus irreversible operations

Recovery depends on what was deleted:

| Operation | Recovery policy |
| --- | --- |
| Canvas Item deletion | Use normal Undo/Redo. |
| Screen deletion | Use normal Undo/Redo; owned content and inbound Navigation are restored together. |
| Managed Project deletion | Not part of document Undo. Deletion requires confirmation and the final remaining Project cannot be deleted. Keep a JSON backup before deleting important Projects. |
| Malformed Project JSON import | The active document, active Project ID, and Project Library remain unchanged; choose another backup file. |
| Local-storage quota/unavailable failure | Use **Save Project JSON** to preserve the latest in-memory work. |

## What this does not provide

web_canvas does not currently provide cloud sync, accounts, automatic off-device backups, or collaboration. Clearing browser/site data can remove locally managed projects. A downloaded Project JSON is therefore the recovery boundary for important local-first work.

The in-app **Backup & recovery** section in Project Manager summarizes the same policy and is available on both desktop and mobile layouts.
