import {
  ChartBarIcon,
  UsersIcon,
  ShoppingCartIcon,
  CalendarIcon,
  BanknotesIcon,
  BellAlertIcon,
  UserPlusIcon,
  DocumentArrowUpIcon,
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

export const SHOP_MENU_SECTIONS = [
  {
    label: "Customer Management",
    icon: UsersIcon,
    items: [
      { name: "Customers", icon: UsersIcon, to: "/customerDashboard" },
      { name: "Add Customer", icon: UserPlusIcon, to: "/addCustomer" },
      { name: "Import Customers", icon: DocumentArrowUpIcon, to: "/import-customers" },
    ],
  },
  {
    label: "Billing",
    icon: DocumentPlusIcon,
    items: [
      { name: "Create Bill", icon: DocumentPlusIcon, to: "/shop" },
      { name: "Upload Bill", icon: DocumentArrowUpIcon, to: "/upload-bill" },
    ],
  },
  {
    label: "Payments",
    icon: BanknotesIcon,
    items: [
      { name: "Record Payment", icon: BanknotesIcon, to: "/payments" },
      { name: "Payment History", icon: ClockIcon, to: "/payments?tab=history" },
      { name: "Outstanding Balance", icon: ClipboardDocumentListIcon, to: "/payments?tab=outstanding" },
    ],
  },
  {
    label: "Notifications",
    icon: BellAlertIcon,
    items: [{ name: "Reminders", icon: BellAlertIcon, to: "/reminders" }],
  },
  {
    label: "Dashboard",
    icon: ChartBarIcon,
    items: [
      { name: "Daily Sales", icon: CalendarIcon, to: "/daily-sales" },
      { name: "Charts & Reports", icon: ChartBarIcon, to: "/charts" },
    ],
  },
  {
    label: "Other",
    icon: ShoppingCartIcon,
    items: [{ name: "Workers", icon: UsersIcon, to: "/workers" }],
  },
];

export const SHOP_MENU = SHOP_MENU_SECTIONS.flatMap((s) =>
  s.items.map((i) => ({ ...i, section: s.label }))
);
