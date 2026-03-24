import React from 'react';
import { Link } from 'react-router-dom';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { Target, Clock, Users, Camera, DollarSign } from 'lucide-react';
import { Listing } from '../types';

interface ListingCardProps {
  listing: Listing;
}

const statusColors: Record<string, string> = {
  DRAFT: 'badge-draft',
  ACTIVE: 'badge-active',
  FUNDED: 'badge-funded',
  COMPLETED: 'badge-completed',
  EXPIRED: 'badge-expired',
  CANCELLED: 'badge-cancelled',
};

export default function ListingCard({ listing }: ListingCardProps) {
  const escrowAmount = listing.escrow?.totalAmount ?? 0;
  const progress = Math.min((escrowAmount / listing.totalGoal) * 100, 100);
  const contributorCount = listing.contributions?.length ?? 0;
  const isExpired = isPast(new Date(listing.deadline));
  const beforePictures = listing.pictures?.filter(p => p.phase === 'BEFORE' && p.isReleased) ?? [];

  const timeLabel = isExpired
    ? `Ended ${formatDistanceToNow(new Date(listing.deadline))} ago`
    : `${formatDistanceToNow(new Date(listing.deadline))} left`;

  return (
    <Link to={`/listings/${listing.id}`} className="card hover:shadow-md transition-shadow duration-200 group block">
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-primary-50 to-pink-50 overflow-hidden">
        {beforePictures.length > 0 ? (
          <div className="protected-image-container w-full h-full">
            <img
              src={`/api/pictures/${beforePictures[0].id}/view`}
              alt="Before photo"
              className="w-full h-full object-cover protected-image group-hover:scale-105 transition-transform duration-300"
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-12 h-12 text-primary-200" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className={statusColors[listing.status] || 'badge-draft'}>
            {listing.status}
          </span>
        </div>
        {listing.surgeryType && (
          <div className="absolute bottom-3 left-3">
            <span className="badge bg-white/90 text-gray-700 shadow-sm">
              {listing.surgeryType.name}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {listing.title}
        </h3>

        {listing.patient?.profile && (
          <p className="text-sm text-gray-500 mb-3">
            by {listing.patient.profile.fullName}
          </p>
        )}

        {listing.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{listing.description}</p>
        )}

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-900">
              ${escrowAmount.toLocaleString()}
            </span>
            <span className="text-gray-500">
              of ${listing.totalGoal.toLocaleString()}
            </span>
          </div>
          <div className="progress-bar h-2">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{Math.round(progress)}% funded</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {contributorCount} contributor{contributorCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Clock className={`w-3.5 h-3.5 ${isExpired ? 'text-red-400' : 'text-green-500'}`} />
            <span className={isExpired ? 'text-red-500' : ''}>{timeLabel}</span>
          </span>
        </div>

        {/* Min contribution for photos */}
        {listing.minContributionForPhotos > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-primary-600">
            <Camera className="w-3.5 h-3.5" />
            <span>Photos unlock at ${listing.minContributionForPhotos}+</span>
          </div>
        )}
      </div>
    </Link>
  );
}
