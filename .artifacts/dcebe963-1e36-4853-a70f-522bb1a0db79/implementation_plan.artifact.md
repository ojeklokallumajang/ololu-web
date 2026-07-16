# Fix Missing Driver Documents (Upsert Logic)

The issue is that driver documents and vehicle details are not appearing in the Admin Panel because the `updateSopirDokumen` function uses `.update()`, which fails if a row doesn't already exist in the `driver_details` table. New registrations only create a row in `profiles`.

## User Review Required

> [!IMPORTANT]
> **Data Recovery:** This fix will use `upsert` (Update or Insert). This means if a driver's detail row is missing, it will be created automatically when they upload their documents.

## Proposed Changes

### Data Layer (`store.ts`)

#### [MODIFY] [store.ts](file:///W:/ololuv1/src/services/store.ts)
- Change `updateSopirDokumen` from `.update()` to `.upsert()`.
- Ensure `disetujui_admin` and `ditolak_admin` are correctly initialized during upsert.

## Verification Plan

### Manual Verification
1. Create a new Driver account.
2. Complete the document upload step.
3. Check Admin Panel -> Rider tab.
4. **Expected:** The rider's name, license plate, and photos should now appear correctly in the modal.
