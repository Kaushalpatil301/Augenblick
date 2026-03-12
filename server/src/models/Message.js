import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
    {
        tripId: {
            type: Schema.Types.ObjectId,
            ref: "Trip",
            required: true,
        },
        sender: {
            type: String,
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
        isSystem: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Message", messageSchema);
