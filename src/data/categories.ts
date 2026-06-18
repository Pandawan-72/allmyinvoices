export type Category = {
  id: string;
  label: string;
  icon: string;
  color: string;
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "electronics",  label: "electronics",  icon: "Smartphone",  color: "#3B82F6" },
  { id: "home",         label: "home",         icon: "Home",        color: "#10B981" },
  { id: "vehicle",      label: "vehicle",      icon: "Car",         color: "#F59E0B" },
  { id: "clothing",     label: "clothing",     icon: "Shirt",       color: "#EC4899" },
  { id: "leisure",      label: "leisure",      icon: "Gamepad2",    color: "#8B5CF6" },
  { id: "health",       label: "health",       icon: "Heart",       color: "#EF4444" },
  { id: "other",        label: "other",        icon: "Package",     color: "#6B7280" },
];

export function findCategory(id: string): Category {
  return DEFAULT_CATEGORIES.find((c) => c.id === id) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
}
