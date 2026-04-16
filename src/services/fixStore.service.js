import { FixModel } from "../models/fix.model.js";

export const saveFixSuggestions = async (
  prNumber,
  fixes,
  payload
) => {
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  await FixModel.findOneAndUpdate(
    { prNumber, owner, repo },
    {
      prNumber,
      owner,
      repo,
      fixes,
    },
    { upsert: true, new: true }
  );
};

export const getFixSuggestions = async (prNumber, payload) => {
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  const data = await FixModel.findOne({
    prNumber,
    owner,
    repo,
  });

  return data?.fixes || [];
};

export const clearFixSuggestions = async (prNumber, payload) => {
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;

  await FixModel.deleteOne({
    prNumber,
    owner,
    repo,
  });
};