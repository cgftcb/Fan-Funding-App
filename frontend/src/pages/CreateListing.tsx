import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  Calendar,
  User,
  Building,
  Phone,
  Camera,
  Info,
  Shield,
  ChevronRight,
} from 'lucide-react';
import Layout from '../components/Layout';
import { listingsApi, adminApi } from '../api/client';
import { SurgeryType } from '../types';
import axios from 'axios';

interface CreateListingForm {
  title: string;
  description: string;
  surgeryTypeId: string;
  goalAmount: string;
  deadline: string;
  surgeonName: string;
  surgeonOffice: string;
  surgeonContact: string;
  minContributionForPhotos: string;
}

export default function CreateListing() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateListingForm>();

  const goalAmount = parseFloat(watch('goalAmount') || '0');
  const surgeryTypeId = watch('surgeryTypeId');
  const minContribution = parseFloat(watch('minContributionForPhotos') || '0');

  const { data: surgeryTypesData } = useQuery({
    queryKey: ['surgery-types-public'],
    queryFn: () => adminApi.getSurgeryTypes(),
    select: (res) => res.data,
  });

  const surgeryTypes: SurgeryType[] = surgeryTypesData?.surgeryTypes ?? [];
  const selectedSurgeryType = surgeryTypes.find(s => s.id === surgeryTypeId);
  const adminFeePercent = selectedSurgeryType?.adminFeePercent ?? 10;
  const adminFeeAmount = (goalAmount * adminFeePercent) / 100;
  const totalGoal = goalAmount + adminFeeAmount;
  const estimatedInsuranceFee = goalAmount * 0.05; // 5% estimate

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 7);
  const minDateStr = minDate.toISOString().split('T')[0];

  const onSubmit = async (data: CreateListingForm) => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await listingsApi.create({
        ...data,
        goalAmount: parseFloat(data.goalAmount),
        minContributionForPhotos: parseFloat(data.minContributionForPhotos) || 0,
      });

      const listingId = response.data.listing.id;
      navigate(`/patient/dashboard`, { replace: true });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Failed to create listing');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create a New Listing</h1>
          <p className="text-gray-500 text-sm mt-1">Set up your surgery funding campaign</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="form-label">Campaign Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Help me fund my rhinoplasty journey"
                  className="input-field"
                  {...register('title', {
                    required: 'Title is required',
                    minLength: { value: 10, message: 'Title must be at least 10 characters' },
                    maxLength: { value: 100, message: 'Title must be under 100 characters' },
                  })}
                />
                {errors.title && <p className="form-error">{errors.title.message}</p>}
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea
                  rows={4}
                  placeholder="Share your story, why you want this procedure, and what it means to you..."
                  className="input-field resize-none"
                  {...register('description')}
                />
                <p className="form-hint">Tell your story to attract contributors</p>
              </div>

              <div>
                <label className="form-label">Surgery Type *</label>
                <select
                  className="input-field"
                  {...register('surgeryTypeId', { required: 'Surgery type is required' })}
                >
                  <option value="">Select surgery type...</option>
                  {surgeryTypes.filter(s => s.isActive).map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
                {errors.surgeryTypeId && <p className="form-error">{errors.surgeryTypeId.message}</p>}
                {selectedSurgeryType?.description && (
                  <p className="form-hint">{selectedSurgeryType.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Funding goal */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              Funding Goal
            </h2>

            <div className="space-y-4">
              <div>
                <label className="form-label">Surgery Cost (USD) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="100"
                    placeholder="5000"
                    className="input-field pl-9"
                    {...register('goalAmount', {
                      required: 'Goal amount is required',
                      min: { value: 100, message: 'Minimum goal is $100' },
                    })}
                  />
                </div>
                {errors.goalAmount && <p className="form-error">{errors.goalAmount.message}</p>}
              </div>

              {goalAmount > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Surgery cost</span>
                    <span className="font-medium">${goalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Platform fee ({adminFeePercent}%)</span>
                    <span>+${adminFeeAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                    <span>Total to raise</span>
                    <span className="text-primary-600">${totalGoal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 text-xs">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Insurance fee (est. 5%)
                    </span>
                    <span>${estimatedInsuranceFee.toFixed(2)} (refundable if goal not met)</span>
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">Funding Deadline *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    min={minDateStr}
                    className="input-field pl-9"
                    {...register('deadline', { required: 'Deadline is required' })}
                  />
                </div>
                {errors.deadline && <p className="form-error">{errors.deadline.message}</p>}
                <p className="form-hint">Minimum 7 days from today. Goal must be reached by this date.</p>
              </div>
            </div>
          </div>

          {/* Surgeon info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              Surgeon Information
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Surgeon information is required for funds to be released. You can add it later or update it before funding is complete.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="form-label">Surgeon Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Dr. Jane Smith"
                    className="input-field pl-9"
                    {...register('surgeonName')}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Surgeon's Office / Practice</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Beverly Hills Plastic Surgery"
                    className="input-field pl-9"
                    {...register('surgeonOffice')}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Surgeon's Contact</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Phone or email"
                    className="input-field pl-9"
                    {...register('surgeonContact')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Photo access */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              Photo Access Settings
            </h2>

            <div>
              <label className="form-label">Minimum Contribution for Photo Access (USD)</label>
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  className="input-field pl-9"
                  {...register('minContributionForPhotos')}
                />
              </div>
              <p className="form-hint">
                Contributors who contribute this amount or more will get access to your before & after photos.
                Set to 0 to give all contributors photo access.
              </p>
              {minContribution > 0 && (
                <div className="mt-2 flex items-center gap-2 text-sm text-primary-600">
                  <Camera className="w-4 h-4" />
                  <span>Contributors need to contribute ${minContribution.toFixed(2)}+ to unlock photos</span>
                </div>
              )}
            </div>

            {selectedSurgeryType?.photoRequirements && selectedSurgeryType.photoRequirements.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Required Photos for {selectedSurgeryType.name}</h3>
                <ul className="space-y-1">
                  {selectedSurgeryType.photoRequirements.map((req) => (
                    <li key={req.id} className="text-xs text-gray-500 flex items-start gap-1.5">
                      <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-primary-400" />
                      <span>
                        {req.phase} photos: {req.count} required
                        {req.description && ` — ${req.description}`}
                        {req.daysAfterSurgery && ` (${req.daysAfterSurgery} days after surgery)`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="card p-6 bg-primary-50 border-primary-200">
            <h3 className="text-sm font-semibold text-primary-900 mb-3">What happens next?</h3>
            <ol className="space-y-2 text-sm text-primary-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary-500 flex-shrink-0">1.</span>
                Your listing is created as a draft
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary-500 flex-shrink-0">2.</span>
                Pay the insurance fee (est. ${estimatedInsuranceFee.toFixed(2)}) to activate it
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary-500 flex-shrink-0">3.</span>
                Upload before photos and your listing goes live
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary-500 flex-shrink-0">4.</span>
                Contributors fund your campaign until the deadline
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary-500 flex-shrink-0">5.</span>
                If goal is met, funds go directly to surgeon. If not, everyone is refunded.
              </li>
            </ol>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary py-3 px-8 text-base flex-1"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating listing...
                </span>
              ) : (
                'Create Listing'
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary py-3 px-6 text-base"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
