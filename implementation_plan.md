# Implementation Plan - Standardizing Address UI with AddressBlock

The goal is to use the `AddressBlock` component consistently across the Admin Dashboard (Subscriptions tab) and the Delivery Schedule tab, ensuring a unified and premium UI for address display.

## Proposed Changes

### 1. `client/src/components/AddressBlock.jsx`
*   Refine the component to handle more `mealType` values (like `single`, `event`, etc.).
*   Improve fallback logic for missing addresses.
*   Ensure internal `CompactAddress` is consistent with the one used in `Dashboard.jsx`.

### 2. `client/src/pages/admin/Dashboard.jsx`
*   Import `AddressBlock`.
*   Remove local `CompactAddress` definition (to avoid redundancy).
*   Replace inline address rendering in the **Subscriptions** tab with `<AddressBlock />`.

### 3. `client/src/pages/admin/DeliveryScheduleTab.jsx`
*   Import `AddressBlock`.
*   Replace `renderAddress(item.address)` with `<AddressBlock />` in:
    *   `DeliveryDetailModal`
    *   Event Spotlight cards
    *   Dispatch Lane cards
*   Normalize the props passed to `AddressBlock` since the schedule data structure differs between subscriptions and one-off orders.

### 4. `server/controllers/deliveryScheduleController.js` (Verification)
*   Ensure the controller provides all necessary address data (`lunchAddress`, `dinnerAddress`, or `address`) for both subscriptions and orders. (Already looks good based on previous view).

## Verification Plan

### Automated/Manual UI Check (using Browser Agent)
1.  **Login as Admin.**
2.  **Navigate to Subscriptions Tab**:
    *   Check if addresses are rendered using the stacked "L"/"D" labels for "Both" meal types.
    *   Verify symmetric padding and font sizes.
3.  **Navigate to Schedule Tab**:
    *   Check Event Spotlight cards for correct address rendering.
    *   Check Dispatch Lanes (Basic, Premium, Exotic) for correct address rendering.
    *   Open `Details` modal for various items and verify address display.
    *   Verify that "Single" and "Event" orders show a reasonable label (or no label if appropriate).

## Normalization Logic for Schedule Tab
*   For **Subscriptions**:
    ```jsx
    <AddressBlock 
      mealType={item.mealType} 
      lunchAddress={item.lunchAddress} 
      dinnerAddress={item.dinnerAddress} 
    />
    ```
*   For **Orders/Events**:
    ```jsx
    <AddressBlock 
      mealType={item.mealType} 
      lunchAddress={item.address} 
      dinnerAddress={item.address} 
    />
    ```
