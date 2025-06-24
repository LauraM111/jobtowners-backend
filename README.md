# Subscription Plans API Guide

## API Endpoints

### 1. Create Subscription Plan (Admin Only)
```http
POST /subscription-plans
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Plan Name",
  "description": "Plan Description",
  "price": 0,                    // Set to 0 for free plans
  "interval": "month",           // "month", "year", "week", "day"
  "intervalCount": 1,            // Optional, defaults to 1
  "currency": "usd",             // Optional, defaults to "usd"
  "features": ["Feature 1"],     // Optional
  "numberOfJobs": 10,            // Optional
  "resumeViewsCount": 50,        // Optional
  "skipStripe": true            // Optional, set to true for free plans
}
```

Response (Success - 201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Plan Name",
    "description": "Plan Description",
    "price": 0,
    "interval": "month",
    "intervalCount": 1,
    "currency": "usd",
    "features": ["Feature 1"],
    "numberOfJobs": 10,
    "resumeViewsCount": 50,
    "stripeProductId": null,     // Will be null for free plans
    "stripePriceId": null,       // Will be null for free plans
    "status": "active",
    "createdAt": "2024-04-28T00:00:00.000Z",
    "updatedAt": "2024-04-28T00:00:00.000Z"
  },
  "message": "Subscription plan created successfully"
}
```

### 2. List Subscription Plans (Public)
```http
GET /subscription-plans?status=active&limit=10&offset=0
```

Response (Success - 200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Free Plan",
      "description": "Basic features",
      "price": 0,
      "interval": "month",
      // ... other plan details
    },
    {
      "id": "uuid",
      "name": "Premium Plan",
      "description": "Premium features",
      "price": 19.99,
      "interval": "month",
      // ... other plan details
    }
  ],
  "message": "Subscription plans retrieved successfully"
}
```

### 3. Subscribe to a Plan
```http
POST /subscriptions
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "planId": "uuid"
}
```

Response for Free Plans (Success - 200):
```json
{
  "success": true,
  "data": {
    "subscriptionId": "uuid",
    "status": "active",
    "planDetails": {
      "name": "Free Plan",
      "price": 0,
      "currency": "usd",
      "interval": "month"
    }
  },
  "message": "Subscription created successfully"
}
```

Response for Paid Plans (Success - 200):
```json
{
  "success": true,
  "data": {
    "subscriptionId": "uuid",
    "clientSecret": "pi_xyz_secret_123",
    "planDetails": {
      "name": "Premium Plan",
      "price": 19.99,
      "currency": "usd",
      "interval": "month"
    }
  },
  "message": "Subscription initiated successfully"
}
```

## Frontend Implementation Guide

### 1. Plan Selection Component
```typescript
interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  features: string[];
  numberOfJobs: number;
  resumeViewsCount: number;
}

const PlanSelection: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available plans
    const fetchPlans = async () => {
      try {
        const response = await axios.get('/subscription-plans?status=active');
        setPlans(response.data.data);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return (
    <div className="plans-grid">
      {plans.map(plan => (
        <PlanCard 
          key={plan.id} 
          plan={plan} 
          onSelect={() => handlePlanSelection(plan)}
        />
      ))}
    </div>
  );
};
```

### 2. Subscription Handler
```typescript
interface SubscriptionResponse {
  subscriptionId: string;
  clientSecret?: string;
  status?: string;
  planDetails: {
    name: string;
    price: number;
    currency: string;
    interval: string;
  };
}

const handlePlanSelection = async (plan: Plan) => {
  try {
    const response = await axios.post<SubscriptionResponse>(
      '/subscriptions',
      { planId: plan.id },
      {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      }
    );

    if (plan.price === 0) {
      // Handle free plan subscription
      handleFreeSubscription(response.data);
    } else {
      // Handle paid plan subscription
      await handlePaidSubscription(response.data);
    }
  } catch (error) {
    console.error('Error subscribing to plan:', error);
    // Handle error
  }
};

const handleFreeSubscription = (response: SubscriptionResponse) => {
  // Free plan is automatically activated
  // Redirect to success page or dashboard
  navigate('/subscription/success', {
    state: {
      subscriptionId: response.subscriptionId,
      planDetails: response.planDetails,
    },
  });
};

const handlePaidSubscription = async (response: SubscriptionResponse) => {
  if (!response.clientSecret) {
    throw new Error('Missing payment information');
  }

  // Initialize Stripe
  const stripe = await loadStripe(STRIPE_PUBLIC_KEY);

  // Handle payment
  const { error } = await stripe.confirmPayment({
    clientSecret: response.clientSecret,
    confirmParams: {
      return_url: `${window.location.origin}/subscription/callback`,
    },
  });

  if (error) {
    // Handle payment error
    console.error('Payment error:', error);
  }
};
```

### 3. Subscription Status Component
```typescript
const SubscriptionStatus: React.FC = () => {
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    // Fetch current subscription status
    const fetchSubscription = async () => {
      try {
        const response = await axios.get('/subscriptions/current', {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        });
        setSubscription(response.data.data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    };

    fetchSubscription();
  }, []);

  return (
    <div className="subscription-status">
      {subscription && (
        <>
          <h2>Current Plan: {subscription.planDetails.name}</h2>
          <p>Status: {subscription.status}</p>
          <p>
            Price: {subscription.planDetails.price === 0 
              ? 'Free' 
              : `${subscription.planDetails.price} ${subscription.planDetails.currency}`}
          </p>
          <p>Billing Interval: {subscription.planDetails.interval}</p>
        </>
      )}
    </div>
  );
};
```

## Implementation Notes

1. **Free Plans**:
   - When subscribing to a free plan, the subscription is activated immediately
   - No Stripe integration or payment processing is required
   - Frontend can directly redirect to success page

2. **Paid Plans**:
   - Requires Stripe integration
   - Frontend must handle payment confirmation
   - Subscription status starts as 'incomplete' until payment is confirmed

3. **Error Handling**:
   - Handle network errors
   - Handle payment failures
   - Handle subscription creation failures
   - Implement retry mechanisms for failed payments

4. **UI Considerations**:
   - Clearly indicate free vs paid plans
   - Show loading states during API calls
   - Display appropriate error messages
   - Implement confirmation dialogs for paid subscriptions

5. **Security**:
   - Always validate plan prices on the backend
   - Implement proper authentication
   - Validate subscription status before granting access to features

## Testing

1. Test free plan subscription flow:
   - Create a free plan
   - Subscribe to the free plan
   - Verify immediate activation
   - Check subscription status

2. Test paid plan subscription flow:
   - Create a paid plan
   - Initiate subscription
   - Test payment processing
   - Verify subscription activation after payment

3. Test error scenarios:
   - Network errors
   - Payment failures
   - Invalid plan IDs
   - Expired tokens 