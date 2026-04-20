import React from "react";

const reservationStates = [
  "held reservations block overlapping windows until they confirm, cancel, or expire",
  "confirmed reservations own the slot until a later release or cancellation",
  "cancelled and released reservations remain queryable for audit history"
];

const invariants = [
  "One tenant/resource/time window maps to one active reservation writer.",
  "Adjacent slots are allowed, but overlapping active windows are rejected at the database layer.",
  "Operator actions always carry an explicit reason for confirmation or cancellation."
];

export function BookingReservationsAdminPage(): React.ReactElement {
  return (
    <section>
      <h1>Booking Reservations</h1>
      <p>Canonical reservation control plane for held, confirmed, cancelled, and released booking windows.</p>

      <h2>Reservation States</h2>
      <ul>
        {reservationStates.map((state) => (
          <li key={state}>{state}</li>
        ))}
      </ul>

      <h2>Operational Invariants</h2>
      <ul>
        {invariants.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
