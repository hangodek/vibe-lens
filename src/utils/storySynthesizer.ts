import type { ParsedCodeFile, ExecutionTrace, TraceStep } from '../types/ast';

export function synthesizeUserJourneys(files: ParsedCodeFile[]): ExecutionTrace[] {
  const traces: ExecutionTrace[] = [];

  // Helper to find file by path or name matching
  const findFile = (predicate: (path: string, name: string) => boolean) =>
    files.find((f) => predicate(f.path.toLowerCase(), f.name.toLowerCase()));

  // 0. PRIMARY JOURNEY: USER LOGIN & AUTHENTICATION FLOW
  const loginView = findFile((p) => p.includes('login') && (p.endsWith('.html') || p.endsWith('.tsx') || p.endsWith('.vue')));
  const authHandler = findFile((p) => (p.includes('auth') || p.includes('user')) && (p.includes('handler') || p.includes('route') || p.includes('controller')));
  const authService = findFile((p) => (p.includes('auth') || p.includes('user')) && p.includes('service'));
  const authRepo = findFile((p) => (p.includes('auth') || p.includes('user')) && (p.includes('repo') || p.includes('model') || p.includes('database')));
  const authGuard = findFile((p) => p.includes('middleware') && (p.includes('auth') || p.includes('session') || p.includes('guest')));

  if (loginView && authHandler) {
    const loginSteps: TraceStep[] = [];

    // Step 1: Login View
    loginSteps.push({
      id: 'step-login-1',
      stepNumber: 1,
      title: `Visitor inputs credentials in ${loginView.name}`,
      description: 'User enters email/username and password into the login form and clicks Submit.',
      activeNodeId: loginView.id,
      targetNodeId: authGuard ? authGuard.id : authHandler.id,
      codeLine: '<form action="/login" method="POST">',
      dataPassed: 'POST /login (credentials)',
      codeExplanation: 'Submits user credentials to the server endpoint with CSRF protection.',
      storybook: {
        chapterNumber: 1,
        chapterTitle: 'Credential Submission',
        story: `The visitor inputs their account credentials into ${loginView.name} and clicks Sign In.`,
        humanCausality: 'The browser sends an HTTP POST request carrying the form payload.',
      },
    });

    // Step 2: Security Middleware (if present)
    if (authGuard) {
      loginSteps.push({
        id: 'step-login-guard',
        stepNumber: loginSteps.length + 1,
        title: `Security interception in ${authGuard.name}`,
        description: 'Verifies whether client has an existing active session before allowing login.',
        activeNodeId: authGuard.id,
        targetNodeId: authHandler.id,
        codeLine: 'if shared.UserFromContext(r.Context()) != nil',
        dataPassed: 'r *http.Request',
        codeExplanation: 'Ensures unauthenticated guest state before processing credentials.',
        storybook: {
          chapterNumber: loginSteps.length + 1,
          chapterTitle: 'Session Gatekeeper',
          story: `${authGuard.name} checks incoming traffic to ensure guest access.`,
          humanCausality: 'Intercepts requests before business logic executes.',
        },
      });
    }

    // Step 3: Route Handler
    loginSteps.push({
      id: 'step-login-handler',
      stepNumber: loginSteps.length + 1,
      title: `Request controller in ${authHandler.name}`,
      description: 'Extracts username and password from request and dispatches to auth service.',
      activeNodeId: authHandler.id,
      targetNodeId: authService ? authService.id : authRepo ? authRepo.id : authHandler.id,
      codeLine: 'username := strings.TrimSpace(r.FormValue("username"))',
      dataPassed: 'email, password strings',
      codeExplanation: 'Extracts form parameters and delegates validation to domain service.',
      storybook: {
        chapterNumber: loginSteps.length + 1,
        chapterTitle: 'Controller Handling',
        story: `${authHandler.name} reads the submitted parameters and passes them to authentication service.`,
        humanCausality: 'Separates HTTP request transport from core domain rules.',
      },
    });

    // Step 4: Domain Service
    if (authService) {
      loginSteps.push({
        id: 'step-login-service',
        stepNumber: loginSteps.length + 1,
        title: `Password validation in ${authService.name}`,
        description: 'Queries database for user profile and compares bcrypt password hash.',
        activeNodeId: authService.id,
        targetNodeId: authRepo ? authRepo.id : authHandler.id,
        codeLine: 'user, err := s.repo.GetUserByUsernameOrEmail(identifier)',
        dataPassed: 'identifier string',
        codeExplanation: 'Verifies account existence and validates cryptographic password hash.',
        storybook: {
          chapterNumber: loginSteps.length + 1,
          chapterTitle: 'Cryptographic Verification',
          story: `${authService.name} retrieves the user record and verifies password authenticity.`,
          humanCausality: 'Passwords must never be stored in plain text.',
        },
      });
    }

    // Step 5: Database Repository
    if (authRepo) {
      loginSteps.push({
        id: 'step-login-repo',
        stepNumber: loginSteps.length + 1,
        title: `Database query in ${authRepo.name}`,
        description: 'Executes parameterized SQL SELECT query to retrieve user row.',
        activeNodeId: authRepo.id,
        targetNodeId: authHandler.id,
        codeLine: 'SELECT id, username, email, password_hash FROM users',
        dataPassed: '*User struct (id, email, hash)',
        codeExplanation: 'Executes parameterized query preventing SQL injection.',
        storybook: {
          chapterNumber: loginSteps.length + 1,
          chapterTitle: 'Database Record Retrieval',
          story: `${authRepo.name} queries PostgreSQL to retrieve account record.`,
          humanCausality: 'Retrieves persistent records safely from storage.',
        },
      });
    }

    traces.push({
      id: 'trace-auth-login',
      title: 'User Login & Session Flow',
      triggerLabel: 'User submits login form',
      description: 'End-to-end execution flow from login form submit through middleware, handler, service, and database.',
      steps: loginSteps,
    });
  }

  // 1. JOURNEY: USER REGISTRATION & ACCOUNT CREATION
  const regView = findFile((p) => p.includes('register') && (p.endsWith('.html') || p.endsWith('.tsx') || p.endsWith('.vue')));

  if (regView && authHandler) {
    const steps: TraceStep[] = [
      {
        id: 'step-reg-1',
        stepNumber: 1,
        title: `Visitor submits registration in ${regView.name}`,
        description: 'User enters credentials and submits the form, including CSRF security token.',
        activeNodeId: regView.id,
        targetNodeId: authGuard ? authGuard.id : authHandler.id,
        storybook: {
          chapterNumber: 1,
          chapterTitle: 'User Registration Submission',
          story: `The visitor fills in their username, email, and password on ${regView.name} and clicks Register.`,
          humanCausality: 'The browser packages the form payload with CSRF protection and sends an HTTP POST.',
        },
      },
    ];

    if (authGuard) {
      steps.push({
        id: 'step-reg-guard',
        stepNumber: 2,
        title: `Security check in ${authGuard.name}`,
        description: 'Gatekeeper verifies request: enforces rate limiting and ensures user is not already logged in.',
        activeNodeId: authGuard.id,
        targetNodeId: authHandler.id,
        storybook: {
          chapterNumber: 2,
          chapterTitle: 'Security Gatekeeper',
          story: `${authGuard.name} checks incoming traffic to prevent brute-force attacks and duplicate sessions.`,
          humanCausality: 'If invalid or blocked, the request is rejected immediately before running database code.',
        },
      });
    }

    steps.push({
      id: 'step-reg-handler',
      stepNumber: steps.length + 1,
      title: `Route controller in ${authHandler.name}`,
      description: 'Parses POST data, trims inputs, and passes credentials to domain business service.',
      activeNodeId: authHandler.id,
      targetNodeId: authService ? authService.id : authRepo ? authRepo.id : authHandler.id,
      storybook: {
        chapterNumber: steps.length + 1,
        chapterTitle: 'Controller Orchestration',
        story: `${authHandler.name} receives the parsed form parameters and delegates to the Auth Service.`,
        humanCausality: 'Keeps HTTP transport logic separated from core business validation rules.',
      },
    });

    if (authService) {
      steps.push({
        id: 'step-reg-service',
        stepNumber: steps.length + 1,
        title: `Business validation & hashing in ${authService.name}`,
        description: 'Validates email syntax, checks for duplicate accounts, and hashes password using bcrypt.',
        activeNodeId: authService.id,
        targetNodeId: authRepo ? authRepo.id : authHandler.id,
        storybook: {
          chapterNumber: steps.length + 1,
          chapterTitle: 'Password Encryption & Rules',
          story: `${authService.name} encrypts the raw password into a secure hash and checks username availability.`,
          humanCausality: 'Passwords are never stored in plain text to protect user privacy.',
        },
      });
    }

    if (authRepo) {
      steps.push({
        id: 'step-reg-repo',
        stepNumber: steps.length + 1,
        title: `Database insertion in ${authRepo.name}`,
        description: 'Executes SQL INSERT query to persist user record into PostgreSQL database.',
        activeNodeId: authRepo.id,
        targetNodeId: authHandler.id,
        storybook: {
          chapterNumber: steps.length + 1,
          chapterTitle: 'Database Persistence',
          story: `${authRepo.name} commits the new user row into PostgreSQL and returns the generated User ID.`,
          humanCausality: 'Permanent storage guarantees the user can log back in on future visits.',
        },
      });
    }

    steps.push({
      id: 'step-reg-session',
      stepNumber: steps.length + 1,
      title: `Session creation & redirect in ${authHandler.name}`,
      description: 'Issues HTTP-only session cookie and redirects user to their account dashboard.',
      activeNodeId: authHandler.id,
      targetNodeId: regView.id,
      storybook: {
        chapterNumber: steps.length + 1,
        chapterTitle: 'Login Session Established',
        story: `${authHandler.name} issues a secure HTTP-only cookie and redirects the browser to the destination page.`,
        humanCausality: 'The browser stores the session cookie to keep the user authenticated across pages.',
      },
    });

    traces.push({
      id: 'trace-auth-register',
      title: 'User Registration Journey',
      triggerLabel: 'User submits registration form',
      description: 'End-to-end trace from form input through security checks, bcrypt hashing, and database insertion.',
      steps,
    });
  }

  // 2. JOURNEY: VIEWING PROFILE & ORDER HISTORY
  const profileView = findFile((p) => p.includes('profile') && (p.endsWith('.html') || p.endsWith('.tsx') || p.endsWith('.vue')));
  const orderRepo = findFile((p) => p.includes('order') && (p.includes('repo') || p.includes('service')));

  if (profileView && authHandler) {
    traces.push({
      id: 'trace-auth-profile',
      title: 'Profile & Purchase History Journey',
      triggerLabel: 'User navigates to /profile',
      description: 'Follows how session verification queries user details and past vehicle orders.',
      steps: [
        {
          id: 'step-prof-1',
          stepNumber: 1,
          title: `User visits /profile in ${profileView.name}`,
          description: 'Browser requests account profile page with active session cookie.',
          activeNodeId: profileView.id,
          targetNodeId: authGuard ? authGuard.id : authHandler.id,
          storybook: {
            chapterNumber: 1,
            chapterTitle: 'Profile Navigation',
            story: `The logged-in customer clicks on My Profile (${profileView.name}).`,
            humanCausality: 'Browser attaches the session_id cookie to authenticate the request.',
          },
        },
        {
          id: 'step-prof-2',
          stepNumber: 2,
          title: `Session verification in ${authGuard ? authGuard.name : authHandler.name}`,
          description: 'Validates that session is active; unauthenticated users are bounced to /login.',
          activeNodeId: authGuard ? authGuard.id : authHandler.id,
          targetNodeId: authService ? authService.id : authHandler.id,
          storybook: {
            chapterNumber: 2,
            chapterTitle: 'Session Verification',
            story: 'The server verifies the cookie. If valid, retrieves the authenticated User ID.',
            humanCausality: 'Protects private user information from unauthenticated visitors.',
          },
        },
        {
          id: 'step-prof-3',
          stepNumber: 3,
          title: `Data retrieval across domains in ${authHandler.name}`,
          description: 'Queries user details and past transaction records from Order service.',
          activeNodeId: authHandler.id,
          targetNodeId: orderRepo ? orderRepo.id : profileView.id,
          storybook: {
            chapterNumber: 3,
            chapterTitle: 'Cross-Domain Data Assembly',
            story: 'The controller loads user data and queries the Order domain for past vehicle purchases.',
            humanCausality: 'Gathers all dashboard information in one place before rendering.',
          },
        },
        {
          id: 'step-prof-4',
          stepNumber: 4,
          title: `Template presentation in ${profileView.name}`,
          description: 'Renders account details, member badge, and purchase history cards.',
          activeNodeId: profileView.id,
          storybook: {
            chapterNumber: 4,
            chapterTitle: 'Dashboard Screen Render',
            story: `${profileView.name} displays username, email, member since date, and past orders.`,
            humanCausality: 'The user sees their complete dashboard ready for interaction.',
          },
        },
      ],
    });
  }

  // 3. JOURNEY: SHOPPING & CART FLOW
  const cartView = findFile((p) => (p.includes('cart') || p.includes('product')) && p.endsWith('.html'));
  const cartScript = findFile((p) => (p.includes('cart') || p.includes('home')) && p.endsWith('.js'));
  const orderHandler = findFile((p) => p.includes('order') && (p.includes('handler') || p.includes('route')));

  if (cartView && orderHandler) {
    traces.push({
      id: 'trace-order-cart',
      title: 'Add Car to Cart & Checkout Journey',
      triggerLabel: 'User clicks Add to Cart',
      description: 'Traces client-side event listener, async HTTP request, inventory validation, and cart update.',
      steps: [
        {
          id: 'step-cart-1',
          stepNumber: 1,
          title: `User clicks Add to Cart in ${cartView.name}`,
          description: `User selects vehicle on screen. ${cartScript ? cartScript.name : 'Client'} captures click.`,
          activeNodeId: cartView.id,
          targetNodeId: cartScript ? cartScript.id : orderHandler.id,
          storybook: {
            chapterNumber: 1,
            chapterTitle: 'Vehicle Selection',
            story: `The visitor finds a vehicle on ${cartView.name} and clicks Add to Cart.`,
            humanCausality: 'Event listener intercepts click, attaches CSRF token, and prepares POST data.',
          },
        },
        {
          id: 'step-cart-2',
          stepNumber: 2,
          title: `Async fetch dispatched in ${cartScript ? cartScript.name : cartView.name}`,
          description: 'Dispatches POST /cart/items request with product_id and quantity.',
          activeNodeId: cartScript ? cartScript.id : cartView.id,
          targetNodeId: orderHandler.id,
          storybook: {
            chapterNumber: 2,
            chapterTitle: 'Asynchronous Cart Mutation',
            story: 'The client script sends an asynchronous POST to the server without reloading the page.',
            humanCausality: 'Allows instant user feedback while the server updates the cart.',
          },
        },
        {
          id: 'step-cart-3',
          stepNumber: 3,
          title: `Inventory check & storage in ${orderHandler.name}`,
          description: 'Validates stock availability and saves item to user cart in database.',
          activeNodeId: orderHandler.id,
          targetNodeId: cartView.id,
          storybook: {
            chapterNumber: 3,
            chapterTitle: 'Inventory Check & Cart Persistence',
            story: 'The server verifies car availability and updates the user cart record.',
            humanCausality: 'Prevents overselling and guarantees the cart persists if the page refreshes.',
          },
        },
      ],
    });
  }

  // Fallback if no specific flows detected: Build clean generic architectural pipeline
  if (traces.length === 0) {
    const entry = files.find((f) => f.type === 'layout' || f.path.includes('main') || f.path.includes('server')) || files[0];
    const controller = files.find((f) => f.type === 'api' || f.path.includes('route') || f.path.includes('handler'));
    const service = files.find((f) => f.type === 'hook' || f.path.includes('service') || f.path.includes('logic'));
    const storage = files.find((f) => f.type === 'store' || f.path.includes('repo') || f.path.includes('database'));

    if (entry && controller) {
      traces.push({
        id: 'trace-generic-flow',
        title: 'Core Application Pipeline',
        triggerLabel: 'System execution trigger',
        description: 'Clean architectural sequence tracing data through gateway, controller, service, and database.',
        steps: [
          {
            id: 'step-g-1',
            stepNumber: 1,
            title: `Entrypoint: ${entry.name}`,
            description: entry.description,
            activeNodeId: entry.id,
            targetNodeId: controller.id,
            storybook: {
              chapterNumber: 1,
              chapterTitle: 'System Gateway Ingestion',
              story: `Incoming execution starts at ${entry.name}.`,
              humanCausality: 'Bootstrap layer directs traffic to responsible controllers.',
            },
          },
          {
            id: 'step-g-2',
            stepNumber: 2,
            title: `Controller Handler: ${controller.name}`,
            description: controller.description,
            activeNodeId: controller.id,
            targetNodeId: service ? service.id : storage ? storage.id : controller.id,
            storybook: {
              chapterNumber: 2,
              chapterTitle: 'Route Parameter Validation',
              story: `${controller.name} parses the request payload and verifies required inputs.`,
              humanCausality: 'Ensures data validity before invoking business logic.',
            },
          },
          ...(service
            ? [
                {
                  id: 'step-g-3',
                  stepNumber: 3,
                  title: `Business Service: ${service.name}`,
                  description: service.description,
                  activeNodeId: service.id,
                  targetNodeId: storage ? storage.id : controller.id,
                  storybook: {
                    chapterNumber: 3,
                    chapterTitle: 'Core Business Logic',
                    story: `${service.name} processes business operations and calculations.`,
                    humanCausality: 'Applies business rules independently of HTTP or database transport.',
                  },
                },
              ]
            : []),
        ],
      });
    }
  }

  return traces;
}
