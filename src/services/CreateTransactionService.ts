import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface RequestDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

const ALLOWED_TYPES = ['income', 'outcome'];

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: RequestDTO): Promise<Transaction> {
    if (!ALLOWED_TYPES.includes(type)) {
      throw new AppError('Invalid transaction type.');
    }

    if (Number.isNaN(value) || value < 0) {
      throw new AppError('Invalid transaction value.');
    }

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const {
      total: availableAmount,
    } = await transactionsRepository.getBalance();

    if (value > availableAmount && type === 'outcome') {
      throw new AppError('Insufficient account balance.');
    }

    const categoriesRepository = getRepository(Category);
    let transactionCategory = await categoriesRepository.findOne({
      where: { title: category },
    });

    if (!transactionCategory) {
      transactionCategory = categoriesRepository.create({ title: category });
      await categoriesRepository.save(transactionCategory);
    }

    const transaction = await transactionsRepository.create({
      title,
      type,
      value,
      category: transactionCategory,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
