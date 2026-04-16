import mongoose from "mongoose";

const changeSchema = new mongoose.Schema({
  search: String,
  replace: String,
});

const fixSchema = new mongoose.Schema(
  {
    prNumber: {
      type: Number,
      required: true,
      index: true,
    },
    repo: String,
    owner: String,

    fixes: [
      {
        file: String,
        changes: [changeSchema],
      },
    ],
  },
  { timestamps: true }
);

export const FixModel = mongoose.model("Fix", fixSchema);