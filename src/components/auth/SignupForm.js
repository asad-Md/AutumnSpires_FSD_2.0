"use client";
import WideBtn from "@/components/buttons/WideBtn";
import FormInput from "@/components/auth/FormInput";

export default function SignupForm({ signupData, setSignupData, handleSignup, isLoading }) {
  return (
    <div className='text-center flex flex-col justify-between h-full'>
      <div>
        <h2 className='text-2xl text-white font-bold mb-2'>
          The Crimson Spires
        </h2>
        <p className='text-white mb-6 text-sm'>Sign up to become a member</p>
      </div>
      <div>
        <form
          onSubmit={handleSignup}
          className='space-y-4'
        >
          <FormInput
            type='text'
            placeholder='Username'
            value={signupData.username}
            onChange={(e) =>
              setSignupData({ ...signupData, username: e.target.value })
            }
            required
          />
          <FormInput
            type='email'
            placeholder='Email'
            value={signupData.email}
            onChange={(e) =>
              setSignupData({ ...signupData, email: e.target.value })
            }
            required
          />
          <WideBtn
            type='submit'
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Proceed"}
          </WideBtn>
        </form>
      </div>
    </div>
  );
}
