import express from 'express';
import { requireDesk } from '../middleware/auth.js';
import {
  exportCsv,
  exportXlsx,
  getPhoneVaultShop,
  patchCustomer,
  createProduct,
  createPhone,
  createCategory,
  patchCategory,
  patchProduct,
  patchSale,
  hideSale,
  returnSale,
  returnWing,
  dropWing,
  voidSale,
  patchStaff,
  payDebt,
  saveShop,
  saveLang,
  saveLogo,
  saveOwnerPhoto,
  changeOwnerPin,
  saveRecovery,
} from '../controllers/admin.controller.js';
import {
  addEmployee,
  resetEmployeePin,
  addStock,
  checkout,
  createCustomer,
  createFault,
  deleteCategory,
  deleteCustomer,
  deletePhone,
  exportVault,
  hidePeriod,
  hideDebts,
  importVault,
  enterStaff,
  shopFaces,
  markAllNotes,
  markNote,
  dropNote,
  dropReadNotes,
  patchPhone,
  remindDebt,
  retireProduct,
  saveAccess,
  showHistory,
  takeWing,
} from '../controllers/desk.controller.js';

const router = express.Router();
const owner = requireDesk('ADMIN', 'MANAGER');

router.get('/shop', owner, getPhoneVaultShop);
router.get('/faces', owner, shopFaces);
router.post('/staff/enter', owner, enterStaff);
router.get('/vault.json', owner, exportVault);
router.post('/vault', owner, importVault);
router.post('/sales', owner, checkout);
router.post('/products/:id/add', owner, addStock);
router.post('/products/:id/retire', owner, retireProduct);
router.patch('/phones/:id', owner, patchPhone);
router.delete('/phones/:id', owner, deletePhone);
router.delete('/categories/:id', owner, deleteCategory);
router.post('/customers', owner, createCustomer);
router.delete('/customers/:id', owner, deleteCustomer);
router.post('/history/hide-period', owner, hidePeriod);
router.post('/history/show', owner, showHistory);
router.post('/wings', owner, takeWing);
router.post('/faults', owner, createFault);
router.post('/debts/hide', owner, hideDebts);
router.post('/debts/:id/remind', owner, remindDebt);
router.post('/notes/read-all', owner, markAllNotes);
router.post('/notes/clear-read', owner, dropReadNotes);
router.post('/notes/:id/read', owner, markNote);
router.delete('/notes/:id', owner, dropNote);
router.post('/staff', owner, addEmployee);
router.put('/staff/:id/pin', owner, resetEmployeePin);
router.put('/staff/:id/access', owner, saveAccess);
router.post('/products', owner, createProduct);
router.post('/phones', owner, createPhone);
router.post('/categories', owner, createCategory);
router.patch('/categories/:id', owner, patchCategory);
router.patch('/products/:id', owner, patchProduct);
router.patch('/sales/:id', owner, patchSale);
router.post('/sales/:id/return', owner, returnSale);
router.post('/sales/:id/void', owner, voidSale);
router.post('/sales/:id/hide', owner, hideSale);
router.post('/wings/:id/return', owner, returnWing);
router.delete('/wings/:id', owner, dropWing);
router.patch('/customers/:id', owner, patchCustomer);
router.post('/debts/:id/pay', owner, payDebt);
router.put('/shop', owner, saveShop);
router.put('/shop/lang', owner, saveLang);
router.put('/shop/logo', owner, saveLogo);
router.put('/shop/photo', owner, saveOwnerPhoto);
router.put('/shop/pin', owner, changeOwnerPin);
router.put('/shop/recovery', owner, saveRecovery);
router.patch('/staff/:id', owner, patchStaff);
router.get('/export/:kind.csv', owner, exportCsv);
router.get('/export/:kind.xlsx', owner, exportXlsx);

export default router;
