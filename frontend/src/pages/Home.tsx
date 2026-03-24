import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Heart,
  Shield,
  Camera,
  DollarSign,
  Star,
  ArrowRight,
  Users,
  CheckCircle,
  Stethoscope,
} from 'lucide-react';
import Layout from '../components/Layout';
import ListingCard from '../components/ListingCard';
import { listingsApi, surgeonsApi } from '../api/client';
import { Listing, SurgeonProfile } from '../types';

export default function Home() {
  const { data: listingsData } = useQuery({
    queryKey: ['listings', 'home'],
    queryFn: () => listingsApi.getAll({ page: 1, limit: 6 }),
    select: (res) => res.data,
  });

  const { data: surgeonsData } = useQuery({
    queryKey: ['surgeons', 'suggested'],
    queryFn: () => surgeonsApi.getSuggested(),
    select: (res) => res.data,
  });

  const listings: Listing[] = listingsData?.listings ?? [];
  const surgeons: SurgeonProfile[] = surgeonsData?.surgeons ?? [];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-pink-700 text-white py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-pink-300 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Star className="w-4 h-4 text-gold-300" />
            <span className="text-sm font-medium">Community-funded cosmetic surgery</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Fund Your Dream.<br />
            <span className="text-pink-200">Share Your Journey.</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-100 max-w-2xl mx-auto mb-10">
            Connect with contributors who believe in your transformation.
            Get funded for cosmetic surgery while sharing your before & after story.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register?role=PATIENT" className="bg-white text-primary-700 hover:bg-primary-50 font-semibold py-3 px-8 rounded-xl transition-colors text-base shadow-lg">
              Start Your Journey
            </Link>
            <Link to="/listings" className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-8 rounded-xl transition-colors text-base border border-white/20">
              Browse Listings
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How FanFunding Works</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              A secure, transparent process connecting patients with contributors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                icon: <Heart className="w-6 h-6" />,
                title: 'Create a Listing',
                description: 'Patients post their surgery goal, surgeon info, and before photos to start their campaign.',
                color: 'from-primary-500 to-pink-500',
              },
              {
                step: '02',
                icon: <DollarSign className="w-6 h-6" />,
                title: 'Receive Contributions',
                description: 'Contributors fund your goal. All money is held securely in escrow until the goal is reached.',
                color: 'from-blue-500 to-cyan-500',
              },
              {
                step: '03',
                icon: <Stethoscope className="w-6 h-6" />,
                title: 'Surgery is Booked',
                description: 'When the goal is met, funds are released directly to the surgeon and your case is booked.',
                color: 'from-green-500 to-emerald-500',
              },
              {
                step: '04',
                icon: <Camera className="w-6 h-6" />,
                title: 'Share After Photos',
                description: 'After recovery, upload required photos. Qualifying contributors gain exclusive access.',
                color: 'from-purple-500 to-violet-500',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mx-auto mb-4 shadow-lg`}>
                  {item.icon}
                </div>
                <div className="text-xs font-bold text-gray-300 mb-2">STEP {item.step}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Shield className="w-5 h-5 text-green-600" />,
                bg: 'bg-green-50',
                title: 'Secure Escrow',
                desc: 'All contributions are held in escrow. If the goal isn\'t met, every contributor receives a full refund automatically.',
              },
              {
                icon: <Camera className="w-5 h-5 text-primary-600" />,
                bg: 'bg-primary-50',
                title: 'Protected Photos',
                desc: 'Photos are securely hosted with screenshot and download protection. Access gated by contribution level.',
              },
              {
                icon: <CheckCircle className="w-5 h-5 text-blue-600" />,
                bg: 'bg-blue-50',
                title: 'Digital Agreements',
                desc: 'Patient and surgeon sign digital agreements. Medical consultation documents uploaded securely.',
              },
            ].map((f, i) => (
              <div key={i} className="card p-6">
                <div className={`w-10 h-10 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Active listings */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Active Listings</h2>
              <p className="text-gray-500 mt-1">Support someone's transformation journey</p>
            </div>
            <Link to="/listings" className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Heart className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No active listings yet</p>
              <p className="text-sm mt-1">Be the first to create a listing!</p>
              <Link to="/register?role=PATIENT" className="btn-primary inline-block mt-4">
                Create a Listing
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Featured surgeons */}
      {surgeons.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Featured Surgeons</h2>
                <p className="text-gray-500 mt-1">Verified professionals on our platform</p>
              </div>
              <Link to="/surgeons" className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-sm">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {surgeons.slice(0, 3).map((surgeon) => (
                <div key={surgeon.id} className="card p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {surgeon.user?.profile?.fullName || 'Surgeon'}
                      </h3>
                      {surgeon.specialty && (
                        <p className="text-sm text-primary-600">{surgeon.specialty}</p>
                      )}
                      {surgeon.officeName && (
                        <p className="text-sm text-gray-500 truncate">{surgeon.officeName}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 text-gold-400 fill-current" />
                        <span className="text-xs text-gray-400">Subscribed Pro</span>
                      </div>
                    </div>
                  </div>
                  {surgeon.bio && (
                    <p className="text-sm text-gray-500 mt-3 line-clamp-2">{surgeon.bio}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-pink-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
          <p className="text-primary-100 mb-8 max-w-lg mx-auto">
            Join thousands of patients and contributors on FanFunding. Create your listing or support someone's dream today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register?role=PATIENT" className="bg-white text-primary-700 hover:bg-primary-50 font-semibold py-3 px-8 rounded-xl transition-colors">
              I'm a Patient
            </Link>
            <Link to="/register?role=CONTRIBUTOR" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold py-3 px-8 rounded-xl transition-colors">
              I'm a Contributor
            </Link>
            <Link to="/register?role=SURGEON" className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold py-3 px-8 rounded-xl transition-colors">
              I'm a Surgeon
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
