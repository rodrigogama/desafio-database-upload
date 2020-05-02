import fs from 'fs';
import parse from 'csv-parse/lib/sync';
import { getCustomRepository, getRepository, In } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface CsvTransaction {
  title: string;
  value: string;
  type: 'income' | 'outcome';
  category: string;
}

const csvOptions = {
  columns: true,
  trim: true,
  delimiter: ',',
  skip_lines_with_error: true,
};

class ImportTransactionsService {
  public async execute(filePath: string): Promise<Transaction[]> {
    const csvFile = fs.readFileSync(filePath, { encoding: 'utf-8' });
    const csvRows = parse(csvFile, csvOptions) as CsvTransaction[];

    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    // unique category titles from csv file
    const importedCategories: string[] = csvRows
      .map(({ category }) => category)
      .reduce(
        (unique: string[], item: string) =>
          unique.includes(item) ? unique : [...unique, item],
        [],
      );

    // importedCategories that already exist on our database
    const databaseCategories = await categoriesRepository.find({
      where: { title: In(importedCategories) },
    });

    // importedCategories that do not exist
    const addCategories = importedCategories
      .filter(cat => !databaseCategories.find(dbCat => dbCat.title === cat))
      .map(category => ({ title: category }));

    // new categories inserted on database
    const newCategories = categoriesRepository.create(addCategories);
    await categoriesRepository.save(newCategories);

    // merged categories containing the ones retrieved form database and the ones that we just added
    const allCategories = [...databaseCategories, ...newCategories];

    // transactions array with data from csv and category from database
    const addTransactions = csvRows.map(({ category, value, ...data }) => ({
      ...data,
      value: Number(value), // csv returns a string value instead of a number
      category: allCategories.find(e => e.title === category),
    }));

    // new transations inserted on database
    const newTransations = transactionsRepository.create(addTransactions);
    await transactionsRepository.save(newTransations);

    // remove temporary file from /tmp
    await fs.promises.unlink(filePath);

    return newTransations;
  }
}

export default ImportTransactionsService;
