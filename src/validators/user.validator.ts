import { User } from "../models/v1/user.model";
import ErrorHandler from "../utils/errorHandler";
import { fieldEncryption } from "../utils/field-encryption";

// Overload #1 — When shouldExist is true, return type is User
export async function checkUserExistence(
  { email, userId }: { email?: string; userId?: string },
  shouldExist: true,
): Promise<User>;

// Overload #2 — When shouldExist is false, return type is null
export async function checkUserExistence(
  { email, userId }: { email?: string; userId?: string },
  shouldExist: false,
): Promise<null>;

export async function checkUserExistence(
  { email, userId }: { email?: string; userId?: string },
  shouldExist: boolean,
): Promise<User | null> {
  let user;

  user = email
    ? await (async () => {
        const userIdByEmail = await fieldEncryption.findUserByEmail(email);
        return userIdByEmail ? await User.findByPk(userIdByEmail) : null;
      })()
    : userId
      ? await User.findByPk(userId)
      : null;

  if (!user && shouldExist) {
    throw new ErrorHandler("This account does not exists.", 404);
  }

  if (user && !shouldExist) {
    throw new ErrorHandler(
      "Unable to process email. Please try a different email address or contact support",
      409,
    );
  }

  return shouldExist ? (user as User) : null;
}
