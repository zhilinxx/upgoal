import {
  listGoalsRepo, createGoalRepo, updateGoalRepo, deleteGoalRepo,
} from "../repositories/goalsRepository.js";

const getUserId = (req) => {
  const fromSession = req.session?.user?.id ?? req.user?.id;
  const fromBody    = req.body?.userId;
  const fromQuery   = req.query?.userId;
  const fromParams  = req.params?.userId;
  const id = Number(fromSession ?? fromBody ?? fromQuery ?? fromParams);
  return Number.isFinite(id) && id > 0 ? id : null;
};

export async function listGoalsCtrl(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "userId required" });
    const rows = await listGoalsRepo(userId);
    res.json(rows);
  } catch (e) { next(e); }
}

export async function createGoalCtrl(req, res, next) {
  try {
    const userId = getUserId(req);
    const { name, target, description, dueDate } = req.body || {};
    if (!userId || !name || target == null || !dueDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const row = await createGoalRepo({ userId, name, target, description, dueDate });
    res.status(201).json(row);
  } catch (e) { next(e); }
}

export async function updateGoalCtrl(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: "userId required" });

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "invalid goal id" });
    }

    const { name, target, description, dueDate, saved } = req.body || {};
    await updateGoalRepo(id, { name, target, description, dueDate, saved });

    // return shape your UI expects
    res.json({ id, name, target, current: saved, deadline: dueDate, description });
  } catch (e) { next(e); }
}

export async function deleteGoalCtrl(req, res, next) {
  try {
    const userId = getUserId(req); // accepts body OR query
    if (!userId) return res.status(400).json({ error: "userId required" });

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "invalid goal id" });
    }

    await deleteGoalRepo(id, userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
}
