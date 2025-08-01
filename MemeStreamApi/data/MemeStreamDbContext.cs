using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MemeStreamApi.model;
using Microsoft.EntityFrameworkCore;

namespace MemeStreamApi.data
{
    public class MemeStreamDbContext : DbContext
    {
        public MemeStreamDbContext(DbContextOptions<MemeStreamDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();
        }
    }
}