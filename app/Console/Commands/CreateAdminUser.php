<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateAdminUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:create-admin 
                            {--email= : The email address of the admin user}
                            {--password= : The password for the admin user}
                            {--name= : The name of the admin user}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create an administrative user account';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->option('email') ?: $this->ask('Enter email address');
        $password = $this->option('password') ?: $this->secret('Enter password');
        $name = $this->option('name') ?: $this->ask('Enter full name');

        // Validate input
        $validator = Validator::make([
            'email' => $email,
            'password' => $password,
            'name' => $name,
        ], [
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8',
            'name' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            $this->error('Validation failed:');
            foreach ($validator->errors()->all() as $error) {
                $this->error("  - {$error}");
            }
            return Command::FAILURE;
        }

        // Check if user already exists
        if (User::where('email', $email)->exists()) {
            $this->error("User with email '{$email}' already exists!");
            return Command::FAILURE;
        }

        try {
            // Create the user
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($password),
                'email_verified_at' => now(), // Auto-verify admin users
            ]);

            $this->info("✅ Admin user created successfully!");
            $this->table(['Field', 'Value'], [
                ['ID', $user->id],
                ['Name', $user->name],
                ['Email', $user->email],
                ['Created At', $user->created_at->format('Y-m-d H:i:s')],
            ]);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Failed to create user: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }
}
