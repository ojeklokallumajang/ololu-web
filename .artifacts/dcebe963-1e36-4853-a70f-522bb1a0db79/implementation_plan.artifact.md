# Critical Fix for White Screen (Runtime Crashes)

This plan identifies and fixes several runtime errors that cause the "White Screen" crash, especially after registration or during specific view initializations.

## User Review Required

> [!IMPORTANT]
> **Technical Fix:** I found that the app was calling a function (`getTransaksiSopir`) that didn't exist in the data layer, which caused an immediate crash for some users. I am also adding a global error catcher so that if anything else fails, you'll see a clear error message instead of a blank screen.

## Proposed Changes

### Data Layer (`store.ts`)

#### [MODIFY] [store.ts](file:///W:/ololuv1/src/services/store.ts)
- Implement `getTransaksiSopir(id)` to safely fetch history for a specific driver.
- Ensure `mapOrder` includes all fields to prevent `NaN` in calculations.
- Add `try-catch` inside `getSesi` to handle corrupted local storage.

### Views (`DriverView.tsx` & `PassengerView.tsx`)

#### [MODIFY] [DriverView.tsx](file:///W:/ololuv1/src/components/DriverView.tsx)
- Ensure it uses the correct function names from `OloluStore`.
- Add safety checks for `driverDetail` properties.

#### [MODIFY] [PassengerView.tsx](file:///W:/ololuv1/src/components/PassengerView.tsx)
- Add safety check for `profile.nomorHp` before rendering superuser-only buttons.

### Main Entry (`App.tsx`)

#### [MODIFY] [App.tsx](file:///W:/ololuv1/src/App.tsx)
- Wrap the entire initialization in a robust error handler.
- Clear any potential state conflicts during logout/login.

## Verification Plan

### Manual Verification
1. Register a new user.
2. **Expected:** Dashboard loads successfully.
3. If an error still occurs, a Red Screen with the error details will appear instead of a white screen, allowing for instant diagnosis.
