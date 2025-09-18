import { UserRole } from 'src/modules/users/schemas/user.schema';

export interface UserPayload {
  _id: string;
  email: string;
  role: UserRole;
}
