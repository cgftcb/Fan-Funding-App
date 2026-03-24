import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { DollarSign, Camera, Lock, CheckCircle } from 'lucide-react';
import { contributionsApi } from '../api/client';
import { Listing } from '../types';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface ContributionFormProps {
  listing: Listing;
  onSuccess?: () => void;
}

interface FormData {
  amount: string;
}

export default function ContributionForm({ listing, onSuccess }: ContributionFormProps) {
  const { user, isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormData>();

  const amountValue = parseFloat(watch('amount') || '0');
  const qualifiesForPhotos =
    listing.minContributionForPhotos === 0 || amountValue >= listing.minContributionForPhotos;

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await contributionsApi.contribute(listing.id, parseFloat(data.amount));
      setSuccessMessage(response.data.message || 'Contribution successful!');
      reset();
      if (onSuccess) onSuccess();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setErrorMessage(err.response?.data?.error || 'Failed to process contribution');
      } else {
        setErrorMessage('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="card p-6 text-center">
        <Lock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-900 mb-2">Join to Contribute</h3>
        <p className="text-sm text-gray-500 mb-4">
          Create a contributor account to support this listing.
        </p>
        <Link
          to="/register?role=CONTRIBUTOR"
          className="btn-primary text-sm inline-block"
        >
          Create Account
        </Link>
        <p className="text-xs text-gray-400 mt-2">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link>
        </p>
      </div>
    );
  }

  if (user?.role !== 'CONTRIBUTOR') {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-gray-500">
          Only contributor accounts can make contributions.
        </p>
      </div>
    );
  }

  if (listing.status !== 'ACTIVE') {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-gray-500">
          This listing is no longer accepting contributions.
        </p>
      </div>
    );
  }

  const remainingAmount = listing.totalGoal - (listing.escrow?.totalAmount ?? 0);

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-gray-900 mb-4 text-lg">Make a Contribution</h3>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="form-label">
            Contribution Amount (USD)
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="1"
              max={remainingAmount}
              placeholder="Enter amount"
              className="input-field pl-9"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 1, message: 'Minimum contribution is $1' },
                max: {
                  value: remainingAmount,
                  message: `Maximum contribution is $${remainingAmount.toFixed(2)}`,
                },
              })}
            />
          </div>
          {errors.amount && (
            <p className="form-error">{errors.amount.message}</p>
          )}
        </div>

        {/* Photo access indicator */}
        {listing.minContributionForPhotos > 0 && (
          <div className={`p-3 rounded-lg border ${
            qualifiesForPhotos && amountValue > 0
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <Camera className={`w-4 h-4 ${
                qualifiesForPhotos && amountValue > 0 ? 'text-green-600' : 'text-gray-400'
              }`} />
              <p className={`text-sm ${
                qualifiesForPhotos && amountValue > 0 ? 'text-green-700' : 'text-gray-500'
              }`}>
                {qualifiesForPhotos && amountValue > 0
                  ? 'You will get access to before & after photos!'
                  : `Contribute $${listing.minContributionForPhotos}+ to unlock photo access`}
              </p>
            </div>
          </div>
        )}

        {listing.minContributionForPhotos === 0 && (
          <div className="p-3 rounded-lg border bg-green-50 border-green-200">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-700">
                All contributors get photo access for this listing!
              </p>
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Remaining to fund</span>
            <span className="font-medium">${remainingAmount.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full text-base py-3"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            `Contribute ${amountValue > 0 ? `$${amountValue.toFixed(2)}` : ''}`
          )}
        </button>

        <p className="text-xs text-gray-400 text-center">
          Contributions are held securely in escrow until the funding goal is reached.
          If the goal isn't met by the deadline, you'll receive a full refund.
        </p>
      </form>
    </div>
  );
}
