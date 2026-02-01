# Pikes - Calendar App

A modern, full-stack calendar application built with Next.js, TypeScript, MongoDB, and shadcn/ui.

## 🚀 Features

- ✨ Beautiful UI with shadcn/ui components
- 📅 Multiple calendar views (Month, Week, Day, Agenda)
- 🎨 Customizable event colors
- 🔄 Real-time event management (CRUD operations)
- 🗄️ MongoDB backend with Mongoose ODM
- ✅ Comprehensive testing (Unit, Integration, E2E)
- 🔍 ESLint + Prettier for code quality
- 🚦 CI/CD with GitHub Actions
- 📱 Fully responsive design

## 📋 Prerequisites

- Node.js 20+
- MongoDB (local or MongoDB Atlas)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd pikes
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your MongoDB connection string:

   ```
   MONGODB_URI=mongodb://localhost:27017/calendar-app
   # or for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📜 Available Scripts

### Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking

### Testing

- `npm test` - Run unit and integration tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run E2E tests with Playwright
- `npm run test:e2e:ui` - Run E2E tests in UI mode
- `npm run test:e2e:report` - Show Playwright test report

## 🧪 Testing

### Unit & Integration Tests

```bash
npm test
```

Coverage threshold is set to 80% for:

- Branches
- Functions
- Lines
- Statements

### E2E Tests

```bash
npm run test:e2e
```

Tests run on Chromium, Firefox, and WebKit.

## 🔄 Git Workflow

This project uses:

- **Husky** for Git hooks
- **lint-staged** for pre-commit linting
- **commitlint** for conventional commits

### Commit Message Format

```
type(scope?): subject

Types: feat, fix, docs, style, refactor, perf, test, chore, revert, ci, build
```

Examples:

```bash
git commit -m "feat: add event creation dialog"
git commit -m "fix: correct date formatting issue"
git commit -m "docs: update README with setup instructions"
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Component Library**: shadcn/ui
- **Database**: MongoDB with Mongoose
- **Date Handling**: date-fns
- **Validation**: Zod
- **Testing**: Jest, React Testing Library, Playwright
- **Code Quality**: ESLint, Prettier
- **CI/CD**: GitHub Actions
