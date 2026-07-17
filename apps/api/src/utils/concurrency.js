import mongoose from "mongoose";

export async function withTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export function conflict(message) {
  const error = new Error(message);
  error.status = 409;
  return error;
}
