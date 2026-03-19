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
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export const SHOP_MENU_SECTIONS = [
  {
    label: "Customer Management",
    labelKey: "customerManagement",
    icon: UsersIcon,
    items: [
      { name: "Customers", nameKey: "customers", icon: UsersIcon, to: "/customerDashboard" },
      { name: "Add Customer", nameKey: "addCustomer", icon: UserPlusIcon, to: "/addCustomer" },
      { name: "Import Customers", nameKey: "importCustomers", icon: DocumentArrowUpIcon, to: "/import-customers" },
    ],
  },
  {
    label: "Billing",
    labelKey: "billing",
    icon: DocumentPlusIcon,
    items: [
      { name: "Create Bill", nameKey: "createBill", icon: DocumentPlusIcon, to: "/shop" },
      { name: "Upload Bill", nameKey: "uploadBill", icon: DocumentArrowUpIcon, to: "/upload-bill" },
    ],
  },
  {
    label: "Girvi (Loans)",
    labelKey: "girviLoans",
    icon: CurrencyDollarIcon,
    items: [
      { name: "Girvi List", nameKey: "girviList", icon: CurrencyDollarIcon, to: "/girvi" },
      { name: "New Girvi", nameKey: "newGirvi", icon: DocumentPlusIcon, to: "/girvi/new" },
      { name: "Interest Due", nameKey: "interestDue", icon: ClockIcon, to: "/girvi/interest-due" },
    ],
  },
  {
    label: "Metal Exchange",
    labelKey: "metalExchange",
    icon: ArrowsRightLeftIcon,
    items: [
      { name: "New Exchange", nameKey: "newExchange", icon: ArrowsRightLeftIcon, to: "/metal-exchange/new" },
      { name: "Exchange History", nameKey: "exchangeHistory", icon: ClipboardDocumentListIcon, to: "/metal-exchange" },
      { name: "Advance Balance", nameKey: "advanceBalance", icon: BanknotesIcon, to: "/metal-exchange/advance" },
    ],
  },
  {
    label: "Orders & Repairs",
    labelKey: "ordersRepairs",
    icon: WrenchScrewdriverIcon,
    items: [
      { name: "All Orders", nameKey: "allOrders", icon: ClipboardDocumentListIcon, to: "/orders" },
      { name: "New Order / Repair", nameKey: "newOrderRepair", icon: DocumentPlusIcon, to: "/orders/new" },
    ],
  },
  {
    label: "Stock",
    labelKey: "stock",
    icon: CubeIcon,
    items: [
      { name: "Items", nameKey: "items", icon: CubeIcon, to: "/stock" },
      { name: "Add Item", nameKey: "addItem", icon: DocumentPlusIcon, to: "/stock/items/new" },
      { name: "Stock In / Out", nameKey: "stockInOut", icon: ArrowsRightLeftIcon, to: "/stock/movements" },
      { name: "Low Stock", nameKey: "lowStock", icon: ExclamationTriangleIcon, to: "/stock/low-stock" },
    ],
  },
  {
    label: "Payments",
    labelKey: "payments",
    icon: BanknotesIcon,
    items: [
      { name: "Record Payment", nameKey: "recordPayment", icon: BanknotesIcon, to: "/payments" },
      { name: "Payment History", nameKey: "paymentHistory", icon: ClockIcon, to: "/payments?tab=history" },
      { name: "Outstanding Balance", nameKey: "outstandingBalance", icon: ClipboardDocumentListIcon, to: "/payments?tab=outstanding" },
    ],
  },
  {
    label: "Notifications",
    labelKey: "notifications",
    icon: BellAlertIcon,
    items: [{ name: "Reminders", nameKey: "reminders", icon: BellAlertIcon, to: "/reminders" }],
  },
  {
    label: "Dashboard",
    labelKey: "dashboard",
    icon: ChartBarIcon,
    items: [
      { name: "Daily Sales", nameKey: "dailySales", icon: CalendarIcon, to: "/daily-sales" },
      { name: "Charts & Reports", nameKey: "chartsReports", icon: ChartBarIcon, to: "/charts" },
    ],
  },
  {
    label: "Other",
    labelKey: "other",
    icon: ShoppingCartIcon,
    items: [{ name: "Workers", nameKey: "workers", icon: UsersIcon, to: "/workers" }],
  },
];

export const SHOP_MENU = SHOP_MENU_SECTIONS.flatMap((s) =>
  s.items.map((i) => ({ ...i, section: s.label }))
);
