const db = require("../database/dbConfig");

async function findById(id) {
  return db("application_submissions")
    .where({ id })
    .first();
}

async function findByCampaignId(campaign_id) {
  return db("skilled_impact_requests")
    .where({ campaign_id })
    .join(
      'application_submissions',
      'skilled_impact_requests.id',
      'application_submissions.skilled_impact_request_id'
    )
    .select(
      'skilled_impact_requests.campaign_id',
      'application_submissions.*'
    );
}

async function insert(submission) {
  return db("application_submissions")
    .insert(submission, ["*"]);
}

async function update(decision, id) {
  const [submission_id] = await db("application_submissions")
    .where({ id })
    .update({decision})
    .returning("id");
  if (submission_id) {
    const submission = await findById(submission_id);
    return submission;
  }
}

module.exports = {
  findById,
  findByCampaignId,
  insert,
  update
};