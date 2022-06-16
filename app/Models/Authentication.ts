import { DateTime } from 'luxon';
import { BaseModel, beforeSave, column } from '@ioc:Adonis/Lucid/Orm';
import Hash from '@ioc:Adonis/Core/Hash';
import Env from '@ioc:Adonis/Core/Env';
import { sha256 } from 'js-sha256';
import jwt from 'jsonwebtoken';

export default class Authentication extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @column()
  public userId: number;

  @column()
  public type: 'email' | 'oauth2';

  @column()
  public provider: 'google' | 'facebook' | null;

  @column()
  public emailVerificationStatus: 'verified' | 'unverified' | 'unsupported';

  @column()
  public providerUserId: string | null;

  @column()
  public providerAccessToken: string | null;

  @column()
  public email: string | null;

  @column()
  public pendingEmail: string | null;

  @column({ serializeAs: null })
  public password: string | null;

  @column()
  public rememberMeToken: string | null;

  @column()
  public activated: boolean | null;

  @column()
  public accessToken: string | null;

  @column()
  public avatarUrl: string | null;

  @beforeSave()
  public static async hashPassword(authentication: Authentication) {
    if (authentication.$dirty.password) {
      if (!authentication.password) {
        throw new Error('password not set');
      }
      authentication.password = await Hash.make(authentication.password);
    }
  }

  public generateToken() : unknown {
    const expiresIn = parseInt(Env.get('TOKEN_EXPIRATION') as string, 10) * 60;

    if (!this.pendingEmail && !this.email) {
      throw new Error('email nor pendingEmail set');
    }

    return jwt.sign(
      { id: this.id, hash: sha256(this.pendingEmail ?? this.email ?? '') },
      this.generateSecret(),
      { expiresIn },
    );
  }

  public generateSecret() : string {
    return `${this.password}-${this.createdAt.toMillis()}`;
  }

  public getEmailVerificationLink(): string {
    const token = this.generateToken();

    return `${Env.get('APP_URL') as string}/verify-email/${token}/${this.id}`;
  }
}
