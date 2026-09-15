import { RoleCode } from '../common/rbac';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roleCode: RoleCode;
  mobile?: string;
  teamId?: string;
}

export interface UpdateUserInput {
  name?: string;
  mobile?: string;
  roleCode?: RoleCode;
  teamId?: string;
}
