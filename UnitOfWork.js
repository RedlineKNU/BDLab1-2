const BookRepository = require('./BookRepository');
// const UserRepository = require('./UserRepository'); // (якщо ви його створено)

class UnitOfWork {
  constructor(client) {
    // Всі репозиторії отримують ОДИН І ТОЙ САМИЙ client,
    // щоб гарантувати, що вони працюють в одній транзакції.
    this.client = client;
    this.books = new BookRepository(client);
    // this.users = new UserRepository(client);
    // this.fines = new FineRepository(client);
  }
}

module.exports = UnitOfWork;