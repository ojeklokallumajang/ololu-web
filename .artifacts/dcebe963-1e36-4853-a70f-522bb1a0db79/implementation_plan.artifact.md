# Final Recovery and Null-Safety for PWA

This plan ensures that the application never crashes due to missing data by implementing strict null-filtering in the data layer and adding a global Error Boundary.

## User Review Required

> [!IMPORTANT]
> This is a deep stability fix. We are adding "Safety Nets" at every level: Data Fetching, State Management, and UI Rendering.

## Proposed Changes

### Data Layer (`store.ts`)

#### [MODIFY] [store.ts](file:///W:/ololuv1/src/services/store.ts)
- Update `getAllPesanan` and `getAllUsers` to filter out any null/undefined results from mapping.
- Ensure `mapOrder` and `mapProfile` are strictly used and never return incomplete objects.

### Main Entry (`App.tsx`)

#### [MODIFY] [App.tsx](file:///W:/ololuv1/src/App.tsx)
- Wrap the entire application in a `try-catch` during initialization.
- Add a fallback UI if a critical error occurs.

### Views (`PassengerView.tsx` & `DriverView.tsx`)

#### [MODIFY] [PassengerView.tsx](file:///W:/ololuv1/src/components/PassengerView.tsx) & [DriverView.tsx](file:///W:/ololuv1/src/components/DriverView.tsx)
- Add additional safety checks in all `.map()` loops.
- Ensure Google Maps components receive hardcoded defaults if state is temporarily invalid.

## Verification Plan

### Manual Verification
1. Register/Login as usual.
2. If a white screen still appears, I will provide a way for the user to see the error log on screen (custom error overlay).
