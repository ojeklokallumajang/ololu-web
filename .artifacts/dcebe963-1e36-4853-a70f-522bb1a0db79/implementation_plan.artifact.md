# Fix Runtime Crashes and Data Mapping

The white screen issue is likely caused by a mismatch between database column names (snake_case) and the frontend data model (camelCase), leading to property access on `undefined` values that crash components like Google Maps.

## User Review Required

> [!IMPORTANT]
> This update fixes the critical "White Screen" bug by ensuring all data coming from Supabase is correctly transformed from `snake_case` to `camelCase` before reaching the UI components.

## Proposed Changes

### Core Logic (`store.ts`)

#### [MODIFY] [store.ts](file:///W:/ololuv1/src/services/store.ts)
- Implement a robust `mapOrder(dbOrder)` helper function to convert database rows to the `Pesanan` type.
- Implement a `mapProfile(dbProfile)` helper function for user profiles.
- Update all methods (`getPesananById`, `getAllPesanan`, `registerPengguna`, `loginPengguna`, `getProfilLogin`) to use these mapping helpers.
- Ensure `buatPesanan` returns a properly mapped `Pesanan` object.

### Components

#### [MODIFY] [PassengerView.tsx](file:///W:/ololuv1/src/components/PassengerView.tsx)
- Add defensive checks for map coordinates.
- Ensure `activeOrder` properties are accessed safely.

#### [MODIFY] [DriverView.tsx](file:///W:/ololuv1/src/components/DriverView.tsx)
- Ensure all database-derived states are correctly typed and mapped.

## Verification Plan

### Manual Verification
1. Register as a new user.
2. Complete OTP verification.
3. **Expected:** Dashboard should load correctly (no white screen).
4. Create an order.
5. **Expected:** Tracking map should show up correctly with markers at the right positions.
6. Verify that "Riwayat Order" shows data correctly.
