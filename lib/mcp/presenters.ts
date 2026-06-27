import type { CategoryDto } from "@/lib/domain/categories";
import type { TxDto } from "@/lib/domain/expenses";

export function presentCategory<T extends CategoryDto>(category: T): Omit<T, "key"> {
  const presented = { ...category };
  delete (presented as Partial<T>).key;
  return presented;
}

export function presentTransaction(transaction: TxDto): Omit<TxDto, "catKey"> {
  const presented = { ...transaction };
  delete (presented as Partial<TxDto>).catKey;
  return presented;
}
