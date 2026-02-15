# Implementation Plan: Order Status, Cancellation Strictness, and Event Timing

The goal is to strictly enforce cancellation policies based on delivery time (not just date), provide visual feedback for "Delivered" orders, and allow users to specify an event time.

## 1. Database Schema Changes
- **File**: `server/models/Order.js`
- **Action**: Add `deliveryTime` field to the `items` array.
- **Status**: [DONE] Added `deliveryTime` as a `String`.

## 2. Event Catering enhancements
- **File**: `client/src/pages/EventCatering.jsx`
- **Action**: 
    - Add `eventTime` state (defaulting to 12:00).
    - Add a `time` input field in the summary card.
    - Update `handleAddToCart` to include this time and use it for the 48-hour advance validation.
- **Status**: [DONE] Implemented state, UI input, and updated cart logic.

## 3. Cart Processing
- **File**: `client/src/pages/Cart.jsx`
- **Action**: 
    - Ensure `deliveryTime` is captured during checkout.
    - For single tiffins, automatically set time to `12:00 PM` for Lunch and `8:00 PM` for Dinner.
- **Status**: [DONE] Updated `dbOrderItems` mapping.

## 4. Cancellation Logic (Backend)
- **File**: `server/controllers/orderController.js`
- **Action**: 
    - Update `cancelOrder` to parse `deliveryTime` from items.
    - Strictly enforce 100% cancellation fee if within the 2h (Single) or 8h (Event) window, or if the time has already passed.
- **Status**: [DONE] Rewrote calculation logic to use precise delivery timestamps.

## 5. Frontend Utilities & UI
- **File**: `client/src/utils/orderUtils.js`
- **Action**: 
    - Update `calculateCancellationFee` to match backend precise timing logic.
    - Add `isOrderPastDelivery` helper.
- **Status**: [DONE] Implemented updated fee logic and helper.

- **File**: `client/src/pages/Orders.jsx`
- **Action**: 
    - Import `isOrderPastDelivery`.
    - Change status badge to "Delivered" if past delivery time.
    - Hide "Cancel" button if past delivery time.
- **Status**: [DONE] Integrated visual updates and cancellation restrictions.

## 6. Admin Dashboard Updates
- **File**: `server/controllers/deliveryScheduleController.js`
- **Action**: Include `deliveryTime` in the dispatch manifest response.
- **Status**: [DONE] Updated controller to derive/extract time.

- **File**: `client/src/pages/admin/Dashboard.jsx` & `DeliveryScheduleTab.jsx`
- **Action**: Display the delivery time in the order cards and dispatch manifest.
- **Status**: [DONE] Updated UI components to show the time.

## Verification Steps
- Place an event order with a specific time.
- Place a single tiffin order and verify cancellation fee changes as the 2h window approaches.
- Verify that a past order automatically shows "Delivered" and lacks a "Cancel" button.
- Check the Admin Dashboard to ensure times are visible for dispatch.
