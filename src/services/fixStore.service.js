import { FixModel } from "../models/fix.model.js";

export const saveFixSuggestions = async ({
  pull_number,
  owner,
  repo,
  fixes,
}) => {
  await FixModel.findOneAndUpdate(
    { prNumber: pull_number, owner, repo },
    {
      prNumber: pull_number,
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