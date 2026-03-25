import { User } from "../models/v1/user.model";
import { CustomerService } from "../models/v1/customer-service.model";
import { Location } from "../models/v1/location.model";
import { Partner } from "../models/v1/partner.model";
import { Referrer } from "../models/v1/referrer.model";
import { SalesConsultant } from "../models/v1/sales-consultant.model";
import { Profile } from "../models/v1/profile.model";
import { Plan } from "../models/v1/plan.model";
import { Feature } from "../models/v1/feature.model";
import BlacklistedToken from "../models/v1/blacklistedToken.model";
import { SubscriptionAllocation } from "../models/v1/subscription-allocation.model";
import { AggregatorThrottleConfig } from "../models/v1/aggregator-throttle-config.model";
import { AdminControl } from "../models/v1/admin-control.model";

export const modelList = [
    User, 
    CustomerService, 
    Location, 
    Partner, 
    Referrer, 
    SalesConsultant,
    Profile,
    Plan,
    Feature,
    SubscriptionAllocation,
    AggregatorThrottleConfig,
    AdminControl,
    BlacklistedToken,
];
