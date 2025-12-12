import { Router } from 'express';
import { createIncome, updateIncome, readIncomeSetup } from '../controllers/incomeController.js';

const r = Router();

r.post('/', createIncome);

r.put('/', updateIncome);              
r.put('/:incomeId', updateIncome);      


r.get('/setup', readIncomeSetup); 

export default r;
