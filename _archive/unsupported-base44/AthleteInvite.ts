import { BaseEntity } from '@base44/entities';
import { Schema, Field } from '@base44/schemas';

@Schema({
  name: 'AthleteInvite',
  permissions: {
    read: {
      all: false,
      owner: true,
      serviceRole: true,
      coach: true,
    },
    create: {
      owner: false,
      serviceRole: true,
      coach: true,
    },
    update: {
      all: false,
      owner: true,
      serviceRole: true,
      coach: true,
    },
    delete: {
      all: false,
      owner: true,
      serviceRole: true,
      coach: true,
    },
  },
})
export class AthleteInvite extends BaseEntity {
  @Field({ type: 'string', unique: true })
  invite_code: string;

  @Field({ type: 'string', index: true })
  coach_id: string; // The user ID of the coach who sent the invite

  @Field({ type: 'string', index: true })
  athlete_email: string;

  @Field({ type: 'datetime' })
  expires_at: Date;

  @Field({ type: 'string', default: 'pending', enum: ['pending', 'accepted', 'declined', 'expired'] })
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}
