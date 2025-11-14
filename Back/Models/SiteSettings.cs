using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace Back.Models
{
    [Table("site_settings")]
    public class SiteSettings
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        [Column("id")]
        public int Id { get; set; } = 1; // Singleton row

        [Column("business_name")]
        public string BusinessName { get; set; }

        [Column("banner_title")]
        public string BannerTitle { get; set; }

        [Column("banner_subtitle")]
        public string BannerSubtitle { get; set; }

        [Column("banner_image")]
        public byte[]? BannerImage { get; set; }

        [Column("hours_json")]
        public string HoursJson { get; set; }

        [Column("contact_phone")]
        public string ContactPhone { get; set; }

        [Column("contact_address")]
        public string ContactAddress { get; set; }

        [Column("social_instagram")]
        public string SocialInstagram { get; set; }

        [Column("social_facebook")]
        public string SocialFacebook { get; set; }
    }
}
