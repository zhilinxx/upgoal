import {
  createIncomeWithCommitments,
  editIncomeSetup,
  getIncomeSetup,          
} from "../services/incomeService.js";

export const createIncome = async (req, res, next) => {
  try {
    const r = await createIncomeWithCommitments(req.body);
    res.status(201).json({ message: "Saved", ...r });
  } catch (e) { next(e); }
};

export const updateIncome = async (req, res, next) => {
  try {
    const dto = { ...req.body, incomeId: req.params.incomeId ? Number(req.params.incomeId) : undefined };
    const r = await editIncomeSetup(dto);
    res.json({ message: "Updated", ...r });
  } catch (e) { next(e); }
};

export const readIncomeSetup = async (req, res, next) => {
  try {
    const userId = req.query.userId || req.params.userId;
    const data = await getIncomeSetup(Number(userId));
    res.json(data);
  } catch (e) { next(e); }
};
