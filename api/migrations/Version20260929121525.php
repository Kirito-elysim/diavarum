<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Schéma initial : comptes, centres, patients, catalogue des cours, programmes, séances, CODEX,
 * plus les contraintes CHECK sur les statuts et les listes de référence (motifs, mots CODEX).
 */
final class Version20260929121525 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Schéma initial du programme d\'entraînement des patients';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE app_user (id UUID NOT NULL, email VARCHAR(180) NOT NULL, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, role VARCHAR(20) NOT NULL, password VARCHAR(255) NOT NULL, security_code_hash VARCHAR(255) DEFAULT NULL, security_code_updated_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL, last_login_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL, created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, archived_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_88BDF3E9E7927C74 ON app_user (email)');
        $this->addSql('CREATE TABLE user_center (user_id UUID NOT NULL, center_id UUID NOT NULL, PRIMARY KEY (user_id, center_id))');
        $this->addSql('CREATE INDEX IDX_25A2F019A76ED395 ON user_center (user_id)');
        $this->addSql('CREATE INDEX IDX_25A2F0195932F377 ON user_center (center_id)');
        $this->addSql('CREATE TABLE center (id UUID NOT NULL, name VARCHAR(255) NOT NULL, city VARCHAR(255) NOT NULL, country VARCHAR(100) DEFAULT \'France\' NOT NULL, created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, archived_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE TABLE chapter (id UUID NOT NULL, title VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, position INT DEFAULT 0 NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE TABLE codex_test (id UUID NOT NULL, words JSONB NOT NULL, clock_time VARCHAR(5) NOT NULL, clock_test_passed BOOLEAN NOT NULL, word_recall_passed BOOLEAN NOT NULL, notes TEXT DEFAULT NULL, created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, patient_id UUID NOT NULL, nurse_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_73A622D56B899279 ON codex_test (patient_id)');
        $this->addSql('CREATE INDEX IDX_73A622D57373BFAA ON codex_test (nurse_id)');
        $this->addSql('CREATE TABLE codex_word (id UUID NOT NULL, word VARCHAR(255) NOT NULL, position INT DEFAULT 0 NOT NULL, active BOOLEAN DEFAULT true NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE TABLE eligibility_reason (id UUID NOT NULL, label VARCHAR(255) NOT NULL, position INT DEFAULT 0 NOT NULL, active BOOLEAN DEFAULT true NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE TABLE interruption_reason (id UUID NOT NULL, label VARCHAR(255) NOT NULL, position INT DEFAULT 0 NOT NULL, active BOOLEAN DEFAULT true NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE TABLE module (id UUID NOT NULL, position INT DEFAULT 0 NOT NULL, title VARCHAR(255) NOT NULL, description TEXT DEFAULT \'\' NOT NULL, estimated_duration INT DEFAULT 30 NOT NULL, mandatory BOOLEAN DEFAULT true NOT NULL, intro BOOLEAN DEFAULT false NOT NULL, published BOOLEAN DEFAULT true NOT NULL, content JSONB DEFAULT \'[]\' NOT NULL, created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, chapter_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_C242628579F4768 ON module (chapter_id)');
        $this->addSql('CREATE TABLE module_competency (id UUID NOT NULL, label TEXT NOT NULL, position INT DEFAULT 0 NOT NULL, module_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_15301FADAFC2B591 ON module_competency (module_id)');
        $this->addSql('CREATE TABLE national_security_code (id INT NOT NULL, code_hash VARCHAR(255) NOT NULL, updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, updated_by_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_8C219652896DBBDE ON national_security_code (updated_by_id)');
        $this->addSql('CREATE TABLE patient (id UUID NOT NULL, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, date_of_birth DATE DEFAULT NULL, eligibility_status VARCHAR(20) DEFAULT \'enregistre\' NOT NULL, eligibility_notes TEXT DEFAULT NULL, medical_data JSONB DEFAULT \'{}\' NOT NULL, administrative_data JSONB DEFAULT \'{}\' NOT NULL, created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, removed_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL, center_id UUID NOT NULL, created_by_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_1ADAD7EBC808BA5A ON patient (last_name)');
        $this->addSql('CREATE INDEX IDX_1ADAD7EB5932F377 ON patient (center_id)');
        $this->addSql('CREATE INDEX IDX_1ADAD7EBB03A8386 ON patient (created_by_id)');
        $this->addSql('CREATE TABLE patient_eligibility_reason (patient_id UUID NOT NULL, eligibility_reason_id UUID NOT NULL, PRIMARY KEY (patient_id, eligibility_reason_id))');
        $this->addSql('CREATE INDEX IDX_806268AF6B899279 ON patient_eligibility_reason (patient_id)');
        $this->addSql('CREATE INDEX IDX_806268AF228CFA9 ON patient_eligibility_reason (eligibility_reason_id)');
        $this->addSql('CREATE TABLE program_module (id UUID NOT NULL, selected BOOLEAN DEFAULT true NOT NULL, position INT DEFAULT 0 NOT NULL, program_id UUID NOT NULL, module_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_586418723EB8070AAFC2B591 ON program_module (program_id, module_id)');
        $this->addSql('CREATE INDEX IDX_586418723EB8070A ON program_module (program_id)');
        $this->addSql('CREATE INDEX IDX_58641872AFC2B591 ON program_module (module_id)');
        $this->addSql('CREATE TABLE refresh_tokens (refresh_token VARCHAR(128) NOT NULL, username VARCHAR(255) NOT NULL, valid TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, id INT GENERATED BY DEFAULT AS IDENTITY NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_9BACE7E1C74F2195 ON refresh_tokens (refresh_token)');
        $this->addSql('CREATE TABLE session_competency_validation (id UUID NOT NULL, validated BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, session_id UUID NOT NULL, competency_id UUID NOT NULL, validated_by_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_A81EFCA6613FECDFFB9F58C ON session_competency_validation (session_id, competency_id)');
        $this->addSql('CREATE INDEX IDX_A81EFCA6613FECDF ON session_competency_validation (session_id)');
        $this->addSql('CREATE INDEX IDX_A81EFCA6FB9F58C ON session_competency_validation (competency_id)');
        $this->addSql('CREATE INDEX IDX_A81EFCA6C69DE5E5 ON session_competency_validation (validated_by_id)');
        $this->addSql('CREATE TABLE training_program (id UUID NOT NULL, status VARCHAR(20) DEFAULT \'non_actif\' NOT NULL, created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, started_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL, completed_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL, validated_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL, interruption_notes TEXT DEFAULT NULL, interrupted_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL, patient_id UUID NOT NULL, created_by_id UUID NOT NULL, validated_by_id UUID DEFAULT NULL, interrupted_by_id UUID DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_4FD3E78A6B899279 ON training_program (patient_id)');
        $this->addSql('CREATE INDEX IDX_4FD3E78AB03A8386 ON training_program (created_by_id)');
        $this->addSql('CREATE INDEX IDX_4FD3E78AC69DE5E5 ON training_program (validated_by_id)');
        $this->addSql('CREATE INDEX IDX_4FD3E78AF664938F ON training_program (interrupted_by_id)');
        $this->addSql('CREATE TABLE program_interruption_reason (training_program_id UUID NOT NULL, interruption_reason_id UUID NOT NULL, PRIMARY KEY (training_program_id, interruption_reason_id))');
        $this->addSql('CREATE INDEX IDX_31E0369A8406BD6C ON program_interruption_reason (training_program_id)');
        $this->addSql('CREATE INDEX IDX_31E0369A2A67EAD0 ON program_interruption_reason (interruption_reason_id)');
        $this->addSql('CREATE TABLE training_session (id UUID NOT NULL, status VARCHAR(20) DEFAULT \'en_cours\' NOT NULL, started_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, completed_at TIMESTAMP(0) WITH TIME ZONE DEFAULT NULL, duration_seconds INT DEFAULT 0 NOT NULL, score INT DEFAULT NULL, answers JSONB DEFAULT \'[]\' NOT NULL, patient_id UUID NOT NULL, module_id UUID NOT NULL, program_id UUID DEFAULT NULL, nurse_id UUID NOT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_D7A45DA7B00651C ON training_session (status)');
        $this->addSql('CREATE INDEX IDX_D7A45DA6B899279 ON training_session (patient_id)');
        $this->addSql('CREATE INDEX IDX_D7A45DAAFC2B591 ON training_session (module_id)');
        $this->addSql('CREATE INDEX IDX_D7A45DA3EB8070A ON training_session (program_id)');
        $this->addSql('CREATE INDEX IDX_D7A45DA7373BFAA ON training_session (nurse_id)');
        $this->addSql('CREATE TABLE messenger_messages (id BIGINT GENERATED BY DEFAULT AS IDENTITY NOT NULL, body TEXT NOT NULL, headers TEXT NOT NULL, queue_name VARCHAR(190) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, available_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, delivered_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL, PRIMARY KEY (id))');
        $this->addSql('CREATE INDEX IDX_75EA56E0FB7336F0E3BD61CE16BA31DBBF396750 ON messenger_messages (queue_name, available_at, delivered_at, id)');
        $this->addSql('ALTER TABLE user_center ADD CONSTRAINT FK_25A2F019A76ED395 FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE user_center ADD CONSTRAINT FK_25A2F0195932F377 FOREIGN KEY (center_id) REFERENCES center (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE codex_test ADD CONSTRAINT FK_73A622D56B899279 FOREIGN KEY (patient_id) REFERENCES patient (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE codex_test ADD CONSTRAINT FK_73A622D57373BFAA FOREIGN KEY (nurse_id) REFERENCES app_user (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE module ADD CONSTRAINT FK_C242628579F4768 FOREIGN KEY (chapter_id) REFERENCES chapter (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE module_competency ADD CONSTRAINT FK_15301FADAFC2B591 FOREIGN KEY (module_id) REFERENCES module (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE national_security_code ADD CONSTRAINT FK_8C219652896DBBDE FOREIGN KEY (updated_by_id) REFERENCES app_user (id) ON DELETE SET NULL NOT DEFERRABLE');
        $this->addSql('ALTER TABLE patient ADD CONSTRAINT FK_1ADAD7EB5932F377 FOREIGN KEY (center_id) REFERENCES center (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE patient ADD CONSTRAINT FK_1ADAD7EBB03A8386 FOREIGN KEY (created_by_id) REFERENCES app_user (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE patient_eligibility_reason ADD CONSTRAINT FK_806268AF6B899279 FOREIGN KEY (patient_id) REFERENCES patient (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE patient_eligibility_reason ADD CONSTRAINT FK_806268AF228CFA9 FOREIGN KEY (eligibility_reason_id) REFERENCES eligibility_reason (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE program_module ADD CONSTRAINT FK_586418723EB8070A FOREIGN KEY (program_id) REFERENCES training_program (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE program_module ADD CONSTRAINT FK_58641872AFC2B591 FOREIGN KEY (module_id) REFERENCES module (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE session_competency_validation ADD CONSTRAINT FK_A81EFCA6613FECDF FOREIGN KEY (session_id) REFERENCES training_session (id) ON DELETE CASCADE NOT DEFERRABLE');
        $this->addSql('ALTER TABLE session_competency_validation ADD CONSTRAINT FK_A81EFCA6FB9F58C FOREIGN KEY (competency_id) REFERENCES module_competency (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE session_competency_validation ADD CONSTRAINT FK_A81EFCA6C69DE5E5 FOREIGN KEY (validated_by_id) REFERENCES app_user (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE training_program ADD CONSTRAINT FK_4FD3E78A6B899279 FOREIGN KEY (patient_id) REFERENCES patient (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE training_program ADD CONSTRAINT FK_4FD3E78AB03A8386 FOREIGN KEY (created_by_id) REFERENCES app_user (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE training_program ADD CONSTRAINT FK_4FD3E78AC69DE5E5 FOREIGN KEY (validated_by_id) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE training_program ADD CONSTRAINT FK_4FD3E78AF664938F FOREIGN KEY (interrupted_by_id) REFERENCES app_user (id)');
        $this->addSql('ALTER TABLE program_interruption_reason ADD CONSTRAINT FK_31E0369A8406BD6C FOREIGN KEY (training_program_id) REFERENCES training_program (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE program_interruption_reason ADD CONSTRAINT FK_31E0369A2A67EAD0 FOREIGN KEY (interruption_reason_id) REFERENCES interruption_reason (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE training_session ADD CONSTRAINT FK_D7A45DA6B899279 FOREIGN KEY (patient_id) REFERENCES patient (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE training_session ADD CONSTRAINT FK_D7A45DAAFC2B591 FOREIGN KEY (module_id) REFERENCES module (id) NOT DEFERRABLE');
        $this->addSql('ALTER TABLE training_session ADD CONSTRAINT FK_D7A45DA3EB8070A FOREIGN KEY (program_id) REFERENCES training_program (id)');
        $this->addSql('ALTER TABLE training_session ADD CONSTRAINT FK_D7A45DA7373BFAA FOREIGN KEY (nurse_id) REFERENCES app_user (id) NOT DEFERRABLE');

        // Statuts : la base refuse toute valeur hors énumération, même en dehors de l'API
        $this->addSql("ALTER TABLE app_user ADD CONSTRAINT chk_app_user_role CHECK (role IN ('ide', 'cadre', 'admin_national'))");
        $this->addSql("ALTER TABLE patient ADD CONSTRAINT chk_patient_eligibility_status CHECK (eligibility_status IN ('enregistre', 'eligible', 'non_eligible'))");
        $this->addSql("ALTER TABLE training_program ADD CONSTRAINT chk_training_program_status CHECK (status IN ('non_actif', 'actif', 'interrompu', 'acheve'))");
        $this->addSql("ALTER TABLE training_session ADD CONSTRAINT chk_training_session_status CHECK (status IN ('en_cours', 'validee', 'interrompue'))");
        $this->addSql("ALTER TABLE training_session ADD CONSTRAINT chk_training_session_score CHECK (score IS NULL OR score BETWEEN 0 AND 100)");
        $this->addSql("ALTER TABLE training_session ADD CONSTRAINT chk_training_session_duration CHECK (duration_seconds >= 0)");
        $this->addSql("ALTER TABLE national_security_code ADD CONSTRAINT chk_national_security_code_singleton CHECK (id = 1)");

        // Listes de référence (identifiants repris de l'ancienne base)
        $this->addSql("INSERT INTO eligibility_reason (id, label, position, active) VALUES ('50a303cc-72a8-4aa0-836d-84030c748706', 'Troubles cognitifs sévères', 1, true), ('a1266dfd-8cbc-4273-b517-8e3ec1f8955b', 'Patient non consentant', 2, true), ('6af4f3d2-08d2-4f0d-aeff-15d548a49b72', 'État de santé incompatible', 3, true), ('359eaf78-98f1-49b9-965a-dbf813d01135', 'Transfert imminent vers un autre centre', 4, true), ('1a9d0f9b-105e-42db-a01d-74f2d979dd1b', 'Autre (à préciser)', 5, true)");
        $this->addSql("INSERT INTO interruption_reason (id, label, position, active) VALUES ('212a11f9-ba11-4718-aebb-c10cb92f59e3', 'Transfert vers un autre centre', 1, true), ('c3ba6619-666d-48ef-8d0d-5fe9194ebd6b', 'Arrêt temporaire pour raisons médicales', 2, true), ('b9a23e13-0705-404a-b4e2-80ad7afa200f', 'Hospitalisation', 3, true), ('550b651e-011b-445f-910a-5ceb881d8aea', 'Refus du patient de poursuivre', 4, true), ('fae22099-d08f-4698-acf5-2b8df74c0a41', 'Fin de traitement par dialyse', 5, true), ('d9355efb-2126-4859-ab94-3b4a8833ec6a', 'Autre (à préciser)', 6, true)");
        // Pioche du test CODEX : 20 mots (« Chaise » ajouté, l'ancienne base n'en comptait que 19)
        $this->addSql("INSERT INTO codex_word (id, word, position, active) VALUES ('d8361e74-a66a-4cf7-aa91-37933637ea59', 'Pomme', 1, true), ('45b5f4e6-c131-428e-b065-2bb207dcc119', 'Clé', 2, true), ('d4427d71-801a-4134-b8ca-6f257d2988eb', 'Fleur', 3, true), ('a019ab6f-f083-412b-8a4f-4e4b66441343', 'Maison', 4, true), ('79bf4bab-61de-4d0d-810c-31c25e0739fc', 'Chien', 5, true), ('6d50d237-d76c-41a1-9a66-27ce4041c001', 'Livre', 6, true), ('16244e53-c227-482f-9bee-b60904c16acd', 'Bateau', 7, true), ('9117eaad-989e-4e25-8834-3a1f989f799c', 'Arbre', 8, true), ('eaadb2d4-abc4-4f55-8d1f-074a8d649da5', 'Montagne', 9, true), ('b3582b3a-96a8-46a2-a0e5-a3afd1bfe2a8', 'Étoile', 10, true), ('d0b8254a-71ed-4cd7-a9e2-0e233fd9a2ca', 'Rivière', 11, true), ('f1934707-3aa4-4174-94e7-af17c074aef4', 'Jardin', 12, true), ('e1a129a7-4374-4103-8e5a-9a3098784561', 'Nuage', 13, true), ('a0d15cb3-141b-44e8-bbac-eb2c054cafca', 'Oiseau', 14, true), ('bddb7b02-08d1-432e-b865-7f46002148fc', 'Pont', 15, true), ('e0e0f685-0aa1-4514-bb57-587928b3b661', 'Soleil', 16, true), ('4c5e166f-8e0e-4c5a-b595-65a878ba31b1', 'Train', 17, true), ('2a45ad5a-3d9f-4acb-93e7-4a5e5a5221e4', 'Forêt', 18, true), ('aae11d80-458f-437e-97f9-df81ca7bc735', 'Fenêtre', 19, true), ('0199a3c4-7e2b-7c1a-9f3d-5b8e2a6c4d10', 'Chaise', 20, true)");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE user_center DROP CONSTRAINT FK_25A2F019A76ED395');
        $this->addSql('ALTER TABLE user_center DROP CONSTRAINT FK_25A2F0195932F377');
        $this->addSql('ALTER TABLE codex_test DROP CONSTRAINT FK_73A622D56B899279');
        $this->addSql('ALTER TABLE codex_test DROP CONSTRAINT FK_73A622D57373BFAA');
        $this->addSql('ALTER TABLE module DROP CONSTRAINT FK_C242628579F4768');
        $this->addSql('ALTER TABLE module_competency DROP CONSTRAINT FK_15301FADAFC2B591');
        $this->addSql('ALTER TABLE national_security_code DROP CONSTRAINT FK_8C219652896DBBDE');
        $this->addSql('ALTER TABLE patient DROP CONSTRAINT FK_1ADAD7EB5932F377');
        $this->addSql('ALTER TABLE patient DROP CONSTRAINT FK_1ADAD7EBB03A8386');
        $this->addSql('ALTER TABLE patient_eligibility_reason DROP CONSTRAINT FK_806268AF6B899279');
        $this->addSql('ALTER TABLE patient_eligibility_reason DROP CONSTRAINT FK_806268AF228CFA9');
        $this->addSql('ALTER TABLE program_module DROP CONSTRAINT FK_586418723EB8070A');
        $this->addSql('ALTER TABLE program_module DROP CONSTRAINT FK_58641872AFC2B591');
        $this->addSql('ALTER TABLE session_competency_validation DROP CONSTRAINT FK_A81EFCA6613FECDF');
        $this->addSql('ALTER TABLE session_competency_validation DROP CONSTRAINT FK_A81EFCA6FB9F58C');
        $this->addSql('ALTER TABLE session_competency_validation DROP CONSTRAINT FK_A81EFCA6C69DE5E5');
        $this->addSql('ALTER TABLE training_program DROP CONSTRAINT FK_4FD3E78A6B899279');
        $this->addSql('ALTER TABLE training_program DROP CONSTRAINT FK_4FD3E78AB03A8386');
        $this->addSql('ALTER TABLE training_program DROP CONSTRAINT FK_4FD3E78AC69DE5E5');
        $this->addSql('ALTER TABLE training_program DROP CONSTRAINT FK_4FD3E78AF664938F');
        $this->addSql('ALTER TABLE program_interruption_reason DROP CONSTRAINT FK_31E0369A8406BD6C');
        $this->addSql('ALTER TABLE program_interruption_reason DROP CONSTRAINT FK_31E0369A2A67EAD0');
        $this->addSql('ALTER TABLE training_session DROP CONSTRAINT FK_D7A45DA6B899279');
        $this->addSql('ALTER TABLE training_session DROP CONSTRAINT FK_D7A45DAAFC2B591');
        $this->addSql('ALTER TABLE training_session DROP CONSTRAINT FK_D7A45DA3EB8070A');
        $this->addSql('ALTER TABLE training_session DROP CONSTRAINT FK_D7A45DA7373BFAA');
        $this->addSql('DROP TABLE app_user');
        $this->addSql('DROP TABLE user_center');
        $this->addSql('DROP TABLE center');
        $this->addSql('DROP TABLE chapter');
        $this->addSql('DROP TABLE codex_test');
        $this->addSql('DROP TABLE codex_word');
        $this->addSql('DROP TABLE eligibility_reason');
        $this->addSql('DROP TABLE interruption_reason');
        $this->addSql('DROP TABLE module');
        $this->addSql('DROP TABLE module_competency');
        $this->addSql('DROP TABLE national_security_code');
        $this->addSql('DROP TABLE patient');
        $this->addSql('DROP TABLE patient_eligibility_reason');
        $this->addSql('DROP TABLE program_module');
        $this->addSql('DROP TABLE refresh_tokens');
        $this->addSql('DROP TABLE session_competency_validation');
        $this->addSql('DROP TABLE training_program');
        $this->addSql('DROP TABLE program_interruption_reason');
        $this->addSql('DROP TABLE training_session');
        $this->addSql('DROP TABLE messenger_messages');
    }
}
