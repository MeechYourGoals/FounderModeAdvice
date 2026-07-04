export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analysis_access_grants: {
        Row: {
          created_at: string
          episode_id: string
          granted_by_user_id: string
          grantee_user_id: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          episode_id: string
          granted_by_user_id: string
          grantee_user_id: string
          id?: string
          role?: string
        }
        Update: {
          created_at?: string
          episode_id?: string
          granted_by_user_id?: string
          grantee_user_id?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_access_grants_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_invites: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          created_at: string
          episode_id: string
          expires_at: string
          id: string
          invited_by_user_id: string
          invited_email: string
          role: string
          status: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          episode_id: string
          expires_at?: string
          id?: string
          invited_by_user_id: string
          invited_email: string
          role?: string
          status?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          created_at?: string
          episode_id?: string
          expires_at?: string
          id?: string
          invited_by_user_id?: string
          invited_email?: string
          role?: string
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_invites_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmark_folders: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookmarked_episodes: {
        Row: {
          created_at: string
          episode_id: string
          folder_id: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          episode_id: string
          folder_id?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          episode_id?: string
          folder_id?: string | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarked_episodes_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarked_episodes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "bookmark_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarked_lessons: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          lesson_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          lesson_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          lesson_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarked_lessons_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "bookmark_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarked_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      chavel_callouts: {
        Row: {
          callout_text: string
          created_at: string | null
          episode_id: string | null
          id: string
          relevance_score: number | null
        }
        Insert: {
          callout_text: string
          created_at?: string | null
          episode_id?: string | null
          id?: string
          relevance_score?: number | null
        }
        Update: {
          callout_text?: string
          created_at?: string | null
          episode_id?: string | null
          id?: string
          relevance_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chavel_callouts_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          current_stage: string | null
          employee_count: number | null
          founding_year: number | null
          funding_raised: string | null
          id: string
          industry: string | null
          name: string
          status: string | null
          updated_at: string | null
          valuation: string | null
        }
        Insert: {
          created_at?: string | null
          current_stage?: string | null
          employee_count?: number | null
          founding_year?: number | null
          funding_raised?: string | null
          id?: string
          industry?: string | null
          name: string
          status?: string | null
          updated_at?: string | null
          valuation?: string | null
        }
        Update: {
          created_at?: string | null
          current_stage?: string | null
          employee_count?: number | null
          founding_year?: number | null
          funding_raised?: string | null
          id?: string
          industry?: string | null
          name?: string
          status?: string | null
          updated_at?: string | null
          valuation?: string | null
        }
        Relationships: []
      }
      episode_folder_assignments: {
        Row: {
          created_at: string
          episode_id: string
          folder_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          episode_id: string
          folder_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          episode_id?: string
          folder_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_folder_assignments_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_folder_assignments_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "episode_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      episode_transcripts: {
        Row: {
          created_at: string | null
          episode_id: string
          fetched_at: string | null
          id: string
          language: string | null
          source: string | null
          transcript_text: string
        }
        Insert: {
          created_at?: string | null
          episode_id: string
          fetched_at?: string | null
          id?: string
          language?: string | null
          source?: string | null
          transcript_text: string
        }
        Update: {
          created_at?: string | null
          episode_id?: string
          fetched_at?: string | null
          id?: string
          language?: string | null
          source?: string | null
          transcript_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_transcripts_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: true
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          analysis_status: string | null
          analyzed_by: string | null
          analyzed_profile_id: string | null
          analyzed_profile_name_snapshot: string | null
          channel_handle: string | null
          channel_name: string | null
          company_id: string | null
          created_at: string | null
          founder_names: string | null
          founders: string[]
          id: string
          platform: string | null
          podcast_id: string | null
          release_date: string | null
          title: string
          topics: string[] | null
          updated_at: string | null
          url: string
        }
        Insert: {
          analysis_status?: string | null
          analyzed_by?: string | null
          analyzed_profile_id?: string | null
          analyzed_profile_name_snapshot?: string | null
          channel_handle?: string | null
          channel_name?: string | null
          company_id?: string | null
          created_at?: string | null
          founder_names?: string | null
          founders?: string[]
          id?: string
          platform?: string | null
          podcast_id?: string | null
          release_date?: string | null
          title: string
          topics?: string[] | null
          updated_at?: string | null
          url: string
        }
        Update: {
          analysis_status?: string | null
          analyzed_by?: string | null
          analyzed_profile_id?: string | null
          analyzed_profile_name_snapshot?: string | null
          channel_handle?: string | null
          channel_name?: string | null
          company_id?: string | null
          created_at?: string | null
          founder_names?: string | null
          founders?: string[]
          id?: string
          platform?: string | null
          podcast_id?: string | null
          release_date?: string | null
          title?: string
          topics?: string[] | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_analyzed_profile_id_fkey"
            columns: ["analyzed_profile_id"]
            isOneToOne: false
            referencedRelation: "user_startup_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_collections: {
        Row: {
          created_at: string
          id: string
          name: string
          pins: Json
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pins?: Json
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pins?: Json
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      folder_invites: {
        Row: {
          accepted_by_user_id: string | null
          created_at: string
          expires_at: string
          folder_id: string
          id: string
          invited_by_user_id: string
          invited_email: string
          role: Database["public"]["Enums"]["folder_role"]
          status: string
          token_hash: string
        }
        Insert: {
          accepted_by_user_id?: string | null
          created_at?: string
          expires_at?: string
          folder_id: string
          id?: string
          invited_by_user_id: string
          invited_email: string
          role?: Database["public"]["Enums"]["folder_role"]
          status?: string
          token_hash: string
        }
        Update: {
          accepted_by_user_id?: string | null
          created_at?: string
          expires_at?: string
          folder_id?: string
          id?: string
          invited_by_user_id?: string
          invited_email?: string
          role?: Database["public"]["Enums"]["folder_role"]
          status?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_invites_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "episode_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_members: {
        Row: {
          created_at: string
          folder_id: string
          id: string
          role: Database["public"]["Enums"]["folder_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id: string
          id?: string
          role?: Database["public"]["Enums"]["folder_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string
          id?: string
          role?: Database["public"]["Enums"]["folder_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_members_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "episode_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_aliases: {
        Row: {
          alias: string
          canonical_name: string
          created_at: string
          id: string
        }
        Insert: {
          alias: string
          canonical_name: string
          created_at?: string
          id?: string
        }
        Update: {
          alias?: string
          canonical_name?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      insight_comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "insight_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_comments: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          episode_id: string
          id: string
          insight_id: string
          insight_type: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          episode_id: string
          id?: string
          insight_id: string
          insight_type: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          episode_id?: string
          id?: string
          insight_id?: string
          insight_type?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "insight_comments_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_tags: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_tags_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          actionability_score: number | null
          category: string | null
          created_at: string | null
          episode_id: string | null
          founder_attribution: string | null
          id: string
          impact_score: number | null
          lesson_text: string
        }
        Insert: {
          actionability_score?: number | null
          category?: string | null
          created_at?: string | null
          episode_id?: string | null
          founder_attribution?: string | null
          id?: string
          impact_score?: number | null
          lesson_text: string
        }
        Update: {
          actionability_score?: number | null
          category?: string | null
          created_at?: string | null
          episode_id?: string | null
          founder_attribution?: string | null
          id?: string
          impact_score?: number | null
          lesson_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      personalized_insights: {
        Row: {
          action_items: Json | null
          created_at: string | null
          id: string
          lesson_id: string | null
          personalized_text: string
          relevance_score: number | null
          startup_profile_id: string | null
        }
        Insert: {
          action_items?: Json | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          personalized_text: string
          relevance_score?: number | null
          startup_profile_id?: string | null
        }
        Update: {
          action_items?: Json | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          personalized_text?: string
          relevance_score?: number | null
          startup_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personalized_insights_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personalized_insights_startup_profile_id_fkey"
            columns: ["startup_profile_id"]
            isOneToOne: false
            referencedRelation: "user_startup_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      podcasts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          display_name: string
          id: string
          kind: string
          sort_order: number
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          kind: string
          sort_order?: number
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          kind?: string
          sort_order?: number
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      user_monthly_usage: {
        Row: {
          analyses_count: number
          created_at: string
          id: string
          month_year: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analyses_count?: number
          created_at?: string
          id?: string
          month_year: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analyses_count?: number
          created_at?: string
          id?: string
          month_year?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notification_prefs: {
        Row: {
          created_at: string
          daily_prompt: boolean
          marketing: boolean
          plan_reminders: boolean
          push_token: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_prompt?: boolean
          marketing?: boolean
          plan_reminders?: boolean
          push_token?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_prompt?: boolean
          marketing?: boolean
          plan_reminders?: boolean
          push_token?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          inspirations: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          inspirations?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          inspirations?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_startup_profiles: {
        Row: {
          company_name: string
          company_website: string | null
          created_at: string | null
          deck_summary: string | null
          deck_url: string | null
          description: string
          employee_count: number | null
          funding_raised: string | null
          id: string
          industry: string | null
          role: string | null
          stage: Database["public"]["Enums"]["startup_stage"]
          updated_at: string | null
          user_id: string | null
          valuation: string | null
        }
        Insert: {
          company_name: string
          company_website?: string | null
          created_at?: string | null
          deck_summary?: string | null
          deck_url?: string | null
          description: string
          employee_count?: number | null
          funding_raised?: string | null
          id?: string
          industry?: string | null
          role?: string | null
          stage: Database["public"]["Enums"]["startup_stage"]
          updated_at?: string | null
          user_id?: string | null
          valuation?: string | null
        }
        Update: {
          company_name?: string
          company_website?: string | null
          created_at?: string | null
          deck_summary?: string | null
          deck_url?: string | null
          description?: string
          employee_count?: number | null
          funding_raised?: string | null
          id?: string
          industry?: string | null
          role?: string | null
          stage?: Database["public"]["Enums"]["startup_stage"]
          updated_at?: string | null
          user_id?: string | null
          valuation?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          revenuecat_app_user_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          revenuecat_app_user_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          revenuecat_app_user_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      video_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          session_id: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "video_chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_chat_messages_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      video_chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          updated_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          updated_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_chat_sessions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_analysis_invite: {
        Args: { p_token_hash: string }
        Returns: string
      }
      accept_folder_invite: { Args: { p_token_hash: string }; Returns: string }
      can_user_view_invited_episode: {
        Args: { _episode_id: string; _user_id: string }
        Returns: boolean
      }
      check_tier_limits: {
        Args: { p_user_id: string }
        Returns: {
          analyses_count: number
          max_analyses: number
          tier: string
        }[]
      }
      get_or_create_monthly_usage: {
        Args: { p_user_id: string }
        Returns: {
          analyses_count: number
          month_year: string
        }[]
      }
      get_or_create_subscription: {
        Args: { p_user_id: string }
        Returns: {
          status: string
          tier: string
        }[]
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_analysis_count: { Args: { p_user_id: string }; Returns: number }
      insight_belongs_to_episode: {
        Args: {
          _episode_id: string
          _insight_id: string
          _insight_type: string
        }
        Returns: boolean
      }
      is_episode_owner: {
        Args: { _episode_id: string; _user_id: string }
        Returns: boolean
      }
      is_folder_member: {
        Args: { _folder_id: string; _user_id: string }
        Returns: boolean
      }
      is_folder_owner: {
        Args: { _folder_id: string; _user_id: string }
        Returns: boolean
      }
      list_episode_collaborators: {
        Args: { p_episode_id: string }
        Returns: {
          email: string
          is_owner: boolean
          user_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_can_access_episode: {
        Args: { _episode_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_view_episode: {
        Args: { _episode_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_view_lesson: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_boardroom_plan: { Args: { _user_id: string }; Returns: boolean }
      user_has_paid_plan: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      folder_role: "viewer" | "editor"
      startup_stage:
        | "pre_seed"
        | "seed"
        | "series_a"
        | "series_b_plus"
        | "growth"
        | "public"
        | "bootstrapped"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      folder_role: ["viewer", "editor"],
      startup_stage: [
        "pre_seed",
        "seed",
        "series_a",
        "series_b_plus",
        "growth",
        "public",
        "bootstrapped",
      ],
    },
  },
} as const
