/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import type { HashContract } from '@ioc:Adonis/Core/Hash';
import type {
  UserProviderContract,
  ProviderUserContract,
} from '@ioc:Adonis/Addons/Auth';
import User from 'App/Models/User';
import Authentication from 'App/Models/Authentication';

/**
 * The shape of configuration accepted by the MyUserProvider.
 * At a bare minimum, it needs a driver property
 */
export type MyUserProviderConfig = {
  driver: 'myProvider'
}

/**
 * Provider user works as a bridge between your User provider and
 * the AdonisJS auth module.
 */
class ProviderUser implements ProviderUserContract<User> {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    public user: User | null,
    private hash: HashContract,
  ) {}

  public getId() {
    return this.user ? this.user.id : null;
  }

  public getRememberMeToken() {
    return null; // this.user ? this.user.rememberMeToken : null;
  }

  public setRememberMeToken(/* token: string */) {
    // if (!this.user) {
    //   return;
    // }
    // this.user.rememberMeToken = token;
  }

  public async verifyPassword(plainPassword: string) {
    if (!this.user) {
      throw new Error('Cannot verify password for non-existing user');
    }

    const authentication = await Authentication.query()
      .where('userId', this.user.id)
      .andWhere('type', 'email')
      .firstOrFail();

    if (!authentication.password) {
      throw new Error('Password is not set');
    }

    return this.hash.verify(authentication.password, plainPassword);
  }
}

/**
 * The Authentication provider implementation to lookup a user for different
 * operations
 */
export class MyUserProvider implements UserProviderContract<User> {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    public config: MyUserProviderConfig,
    private hash: HashContract,
  ) {}

  public async getUserFor(user: User | null) {
    return new ProviderUser(user, this.hash);
  }

  public async updateRememberMeToken(user: ProviderUser) {
    const id = user.getId();
    if (id === null) {
      throw new Error('user id not set');
    }

    const authentication = await Authentication.query()
      .where('userId', id)
      .andWhere('type', 'email')
      .firstOrFail();

    authentication.merge({
      rememberMeToken: user.getRememberMeToken(),
    });

    await authentication.save();
  }

  public async findById(id: string | number) {
    const user = await User.findOrFail(id);

    return this.getUserFor(user || null);
  }

  public async findByUid(uidValue: string) {
    const authentication = await Authentication.query()
      .where('type', 'email')
      .andWhere('email', uidValue)
      .firstOrFail();

    const user = await User.findOrFail(authentication.userId);

    return this.getUserFor(user || null);
  }

  public async findByRememberMeToken(userId: string | number, token: string) {
    const authentication = await Authentication.query()
      .where('userId', userId)
      .andWhere('rememberMeToken', token)
      .firstOrFail();

    const user = await User.findOrFail(authentication.userId);

    return this.getUserFor(user || null);
  }
}
