export async function withTemporaryDatabase<
  TDatabase extends { close(): void },
  TResult,
>(
  openDatabase: () => Promise<TDatabase>,
  operation: (database: TDatabase) => Promise<TResult>,
): Promise<TResult> {
  const database = await openDatabase()
  try {
    return await operation(database)
  } finally {
    database.close()
  }
}
