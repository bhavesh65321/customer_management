import {
  ChartBarIcon,
  UsersIcon,
  BanknotesIcon,
  UserPlusIcon,
  DocumentArrowUpIcon,
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ArrowsRightLeftIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ReceiptPercentIcon,
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
      { name: "Metal Rates", nameKey: "metalRates", icon: BanknotesIcon, to: "/metal-exchange/rates" },
    ],
  },
  {
    label: "Orders & Repairs",
    labelKey: "ordersRepairs",
    icon: WrenchScrewdriverIcon,
    items: [
      { name: "All Orders", nameKey: "allOrders", icon: ClipboardDocumentListIcon, to: "/orders" },
      { name: "New Order / Repair", nameKey: "newOrderRepair", icon: DocumentPlusIcon, to: "/orders/new" },
      { name: "Workflow Templates", nameKey: "workflowTemplates", icon: WrenchScrewdriverIcon, to: "/orders/workflows" },
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
    label: "Pieces",
    labelKey: "pieces",
    icon: SparklesIcon,
    items: [
      { name: "All Pieces", nameKey: "allPieces", icon: CubeIcon, to: "/inventory/pieces" },
      { name: "Karigars", nameKey: "karigars", icon: UsersIcon, to: "/karigars" },
    ],
  },
  {
    label: "Payments",
    labelKey: "payments",
    icon: BanknotesIcon,
    items: [
      { name: "Payments & Reminders", nameKey: "paymentsReminders", icon: BanknotesIcon, to: "/payments" },
    ],
  },
  {
    label: "Dashboard",
    labelKey: "dashboard",
    icon: ChartBarIcon,
    items: [
      { name: "Dashboard", nameKey: "dashboard", icon: ChartBarIcon, to: "/home" },
      { name: "AI Business Review", nameKey: "aiBusiness", icon: SparklesIcon, to: "/jewellery-business" },
      { name: "GST Reports", nameKey: "gstReports", icon: ReceiptPercentIcon, to: "/gst-reports" },
    ],
  },
  {
    label: "Team",
    labelKey: "team",
    icon: UsersIcon,
    items: [
      { name: "Workers", nameKey: "workers", icon: UsersIcon, to: "/workers" },
    ],
  },
];

export const SHOP_MENU = SHOP_MENU_SECTIONS.flatMap((s) =>
  s.items.map((i) => ({ ...i, section: s.label }))
);
