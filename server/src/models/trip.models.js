import mongoose, { Schema } from "mongoose";

const tripSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    attractions: [
      {
        name: String,
        description: String,
        location: String,
        date: Date,
      },
    ],
    accommodations: [
      {
        name: String,
        address: String,
        checkIn: Date,
        checkOut: Date,
      },
    ],
    transport: [
      {
        type: String, // Flight, Train, Bus, etc.
        details: String,
        departureTime: Date,
        arrivalTime: Date,
      },
    ],
    dining: [
      {
        restaurantName: String,
        cuisine: String,
        dateTime: Date,
      },
    ],
    invitations: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true },
);

export const Trip = mongoose.model("Trip", tripSchema);
