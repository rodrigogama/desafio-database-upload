import { isUuid } from 'uuidv4';
import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    if (!isUuid(id)) {
      throw new AppError('Transaction not found.');
    }

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const transaction = await transactionsRepository.findOne(id);

    if (!transaction) {
      throw new AppError('Transaction not found.');
    }

    await transactionsRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
